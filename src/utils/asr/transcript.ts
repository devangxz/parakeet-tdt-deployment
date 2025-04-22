import config from '../../../config.json'
import logger from '@/lib/logger'
import { diff_match_patch } from '@/utils/transcript/diff_match_patch'

const TIMESTAMP_SPEAKER_PATTERN = new RegExp(config.asr.timestamp_speaker_pattern)

function formatCombinedTranscript(
  rawCombinedTranscript: string,
  fileId: string,
  assemblyAITranscript: string
): string {
  let formattedTranscript = rawCombinedTranscript
    .replace(
      new RegExp(`(${TIMESTAMP_SPEAKER_PATTERN.source})(\\s+)`, 'g'),
      '$1 '
    )
    .replace(/\s+([.,:;?!])/g, '$1')

  const timestamps = []
  let match
  const timestampRegex = new RegExp(TIMESTAMP_SPEAKER_PATTERN, 'g')
  while ((match = timestampRegex.exec(formattedTranscript)) !== null) {
    timestamps.push({
      pattern: match[0],
      index: match.index,
    })
  }
  timestamps.sort((a, b) => b.index - a.index)
  for (let i = 0; i < timestamps.length; i++) {
    const timestampInfo = timestamps[i]
    if (timestampInfo.index > 0) {
      formattedTranscript =
        formattedTranscript.substring(0, timestampInfo.index) +
        '\n\n' +
        formattedTranscript.substring(timestampInfo.index)
    }
  }

  try {
    const originalParas = assemblyAITranscript.split('\n\n')
    const originalContentMap = new Map<string, string>()
    const patternRegex = new RegExp(
      `^(${TIMESTAMP_SPEAKER_PATTERN.source})\s*(.*)$`,
      's'
    )

    for (const para of originalParas) {
      const match = para.trim().match(patternRegex)
      if (match && match[1]) {
        const pattern = match[1]
        const content = match[2] || ''
        originalContentMap.set(pattern, content.trim())
      }
    }

    const currentParas = formattedTranscript.split('\n\n')
    const updatedParas = currentParas.map((para) => {
      const trimmedPara = para.trim()
      const match = trimmedPara.match(patternRegex)
      if (match && match[1] && !match[2]) {
        const pattern = match[1]
        const originalContent = originalContentMap.get(pattern)
        if (originalContent) {
          return `${pattern} ${originalContent}`
        }
      }
      return para
    })
    formattedTranscript = updatedParas.join('\n\n')
  } catch (fillError) {
    logger.error(
      `[${fileId}] Error during empty paragraph filling: ${fillError}`
    )
  }

  formattedTranscript = formattedTranscript
    .replace(
      new RegExp(
        `((${TIMESTAMP_SPEAKER_PATTERN.source}).*?)\\n*(?=(${TIMESTAMP_SPEAKER_PATTERN.source}))`,
        'g'
      ),
      '$1\n\n'
    )
    .replace(/(?<!\n)\n(?!\n)/g, '\n\n')
    .replace(/(\n\n\s*){2,}/g, '\n\n')
    .replace(/\s+([.,:;?!])/g, '$1')

  return formattedTranscript.trim()
}

export function createCombinedTranscript(
  assemblyAITranscript: string,
  gptTranscript: string,
  fileId: string
): string {
  logger.info(
    `[${fileId}] Creating combined transcript using word-level diff processing`
  )

  try {
    if (!assemblyAITranscript.trim() || !gptTranscript.trim()) {
      logger.error(
        `[${fileId}] One or both transcripts are empty, returning AssemblyAI transcript`
      )
      return assemblyAITranscript
    }

    logger.info(`[${fileId}] Generating word-level diff between transcripts`)

    const processedGptTranscript = gptTranscript.replace(/\n+/g, ' ')

    const timestampSpeakerPattern = new RegExp(
      `(${TIMESTAMP_SPEAKER_PATTERN.source})|(\\s+)|([^\\s]+)`,
      'g'
    )
    const assemblyTokens =
      assemblyAITranscript.match(timestampSpeakerPattern) || []
    const gptTokens =
      processedGptTranscript.match(timestampSpeakerPattern) || []

    const tokenToChar = new Map<string, string>()
    const charToToken = new Map<string, string>()
    let nextCharCode = 0xe000

    const uniqueTokens = Array.from(new Set([...assemblyTokens, ...gptTokens]))

    for (const token of uniqueTokens) {
      const char = String.fromCodePoint(nextCharCode++)
      tokenToChar.set(token, char)
      charToToken.set(char, token)
    }

    const surrogate1 = assemblyTokens
      .map((token: string) => tokenToChar.get(token))
      .join('')
    const surrogate2 = gptTokens
      .map((token: string) => tokenToChar.get(token))
      .join('')

    const dmp = new diff_match_patch()
    const surrogateDiffs = dmp.diff_main(surrogate1, surrogate2)

    const diffs = surrogateDiffs.map(([operation, surrogateText]) => {
      const originalTokens = Array.from(surrogateText).map((char) =>
        charToToken.get(char)
      )

      const originalText = originalTokens.join('')

      return [operation, originalText]
    })

    logger.info(
      `[${fileId}] Processing ${diffs.length} word-level diff segments`
    )

    const combinedParts: string[] = []

    for (const [op, text] of diffs) {
      if (op === 0) {
        combinedParts.push(text as string)
      } else if (op === -1) {
        const textStr = text as string

        const structurePattern = new RegExp(
          `(${TIMESTAMP_SPEAKER_PATTERN.source})|(\n)`,
          'g'
        )

        let match
        while ((match = structurePattern.exec(textStr)) !== null) {
          if (match[1]) {
            combinedParts.push(match[1] + ' ')
          } else if (match[2]) {
            combinedParts.push('\n')
          }
        }
      } else if (op === 1) {
        const textStr = text as string

        const cleanText = textStr.replace(
          new RegExp(TIMESTAMP_SPEAKER_PATTERN.source, 'g'),
          ''
        )

        if (cleanText) {
          combinedParts.push(cleanText)
        }
      }
    }

    const rawCombinedTranscript = combinedParts.join('').trim()

    const finalCombinedTranscript = formatCombinedTranscript(
      rawCombinedTranscript,
      fileId,
      assemblyAITranscript
    )

    logger.info(
      `[${fileId}] Successfully created and formatted combined transcript`
    )

    return finalCombinedTranscript
  } catch (error) {
    logger.error(`[${fileId}] Error creating combined transcript: ${error}`)
    return assemblyAITranscript
  }
}
