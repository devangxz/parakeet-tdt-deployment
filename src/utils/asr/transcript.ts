import config from '../../../config.json'
import logger from '@/lib/logger'
import { CTMType } from '@/types/editor'
import { secondsToTs } from '@/utils/secondsToTs'
import { applyTextReplacements } from '@/utils/transcript'
import { diff_match_patch } from '@/utils/transcript/diff_match_patch'

const TIMESTAMP_SPEAKER_PATTERN = new RegExp(
  config.asr.timestamp_speaker_pattern
)

export function getAssemblyAITranscript(ctms: CTMType[]): string {
  const paragraphs: string[] = []
  let currentWords: [number, string][] = []

  ctms.forEach((ctm, index) => {
    const word = ctm.punct ?? ctm.word
    currentWords.push([index, word])

    const isEndOfSentence = currentWords.length > 200 && /[.!?]$/.test(word)
    const isLastWord = index === ctms.length - 1
    const isSpeakerTurn = 'turn' in ctm

    if (isSpeakerTurn || isLastWord || isEndOfSentence) {
      let sentence = currentWords.map(([, w]) => w).join(' ')
      const startCtm = ctms[currentWords[0][0]]

      if (startCtm.speaker) {
        sentence = `${secondsToTs(startCtm.start, true)} ${
          startCtm.speaker
        }: ${sentence}`
      }

      paragraphs.push(sentence)
      currentWords = []
    }
  })

  const transcript = paragraphs.join('\n\n')
  return applyTextReplacements(transcript)
}

function formatCombinedTranscript(
  rawCombinedTranscript: string,
  fileId: string
): string {
  const timestamps = []
  let match
  const timestampRegex = new RegExp(TIMESTAMP_SPEAKER_PATTERN, 'g')
  while ((match = timestampRegex.exec(rawCombinedTranscript)) !== null) {
    timestamps.push({
      pattern: match[0],
      index: match.index,
    })
  }
  timestamps.sort((a, b) => b.index - a.index)
  for (let i = 0; i < timestamps.length; i++) {
    const timestampInfo = timestamps[i]
    if (timestampInfo.index > 0) {
      rawCombinedTranscript =
        rawCombinedTranscript.substring(0, timestampInfo.index) +
        '\n\n' +
        rawCombinedTranscript.substring(timestampInfo.index)
    }
  }

  try {
    const patternRegex = new RegExp(
      `^(${TIMESTAMP_SPEAKER_PATTERN.source})\\s*(.*)$`,
      's'
    )
    const currentParas = rawCombinedTranscript.split('\n\n')
    const filteredParas = currentParas.filter((para) => {
      const trimmed = para.trim()
      const match = trimmed.match(patternRegex)
      if (match && match[1] && !match[2]) {
        return false
      }
      return trimmed.length > 0
    })
    rawCombinedTranscript = filteredParas.join('\n\n')
  } catch (removeError) {
    logger.error(
      `[${fileId}] Error during empty paragraph removal: ${removeError}`
    )
  }

  const formattedTranscript = rawCombinedTranscript
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
    .replace(
      new RegExp(`^(${TIMESTAMP_SPEAKER_PATTERN.source})\\s*`, 'gm'),
      '$1 '
    )

  return formattedTranscript.trim()
}

export function createCombinedTranscript(
  assemblyAITranscript: string,
  gptTranscript: string,
  fileId: string
): string | null {
  logger.info(
    `[${fileId}] Creating combined transcript using word-level diff processing`
  )

  try {
    if (!assemblyAITranscript.trim() || !gptTranscript.trim()) {
      logger.error(
        `[${fileId}] One or both transcripts are empty, returning AssemblyAI transcript`
      )
      return null
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
      fileId
    )

    logger.info(
      `[${fileId}] Successfully created and formatted combined transcript`
    )

    return finalCombinedTranscript
  } catch (error) {
    logger.error(`[${fileId}] Error creating combined transcript: ${error}`)
    return null
  }
}
