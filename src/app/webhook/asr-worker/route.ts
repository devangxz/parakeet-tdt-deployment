import { OrderStatus, ReportMode, ReportOption } from '@prisma/client'
import { Word } from 'assemblyai'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import config from '../../../../config.json'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import authenticateWebhook from '@/utils/authenticateWebhook'
import {
  getCTMs,
  getFormattedTranscript,
  createAlignments,
  updateAlignments,
} from '@/utils/transcript'
import { diff_match_patch } from '@/utils/transcript/diff_match_patch'

const TIMESTAMP_SPEAKER_PATTERN = /\d{1,2}:\d{2}:\d{2}\.\d\sS\d+:/

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

function createCombinedTranscript(
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

function checkCombinedASRFormat(transcript: string, fileId: string) {
  const errors = []
  const VALID_PARAGRAPH_REGEX = /^\d{1,2}:\d{2}:\d{2}\.\d\s+S\d+:\s+.+/

  if (!transcript || !transcript.trim()) {
    logger.info(`[${fileId}] Empty transcript, skipping format validation`)
    return { isValid: true, errors: [] }
  }

  const paragraphs = transcript.split('\n\n')

  for (let i = 0; i < paragraphs.length; i++) {
    const currentParagraph = paragraphs[i]
    const paragraphNumber = i + 1
    const trimmedParagraph = currentParagraph.trim()

    if (trimmedParagraph) {
      if (!VALID_PARAGRAPH_REGEX.test(trimmedParagraph)) {
        errors.push({
          type: 'INVALID_PARAGRAPH_FORMAT',
          paragraphNumber,
          paragraphContent: currentParagraph,
          message: `Paragraph ${paragraphNumber} is invalid. It does not follow the required structure: 'HH:MM:SS.s S#: Text'. Please ensure the paragraph starts correctly with a timestamp and speaker identifier, followed by the text.`,
        })
      }
    }
  }
  const isValid = errors.length === 0
  logger.info(
    `[${fileId}] Combined ASR format validation ${
      isValid ? 'passed' : `failed with ${errors.length} issue(s)`
    }.`
  )
  return { isValid, errors }
}

function calculatePWER(
  assemblyAITranscriptOrWords: string | Word[],
  fileId: string,
  gptTranscript?: string
): number {
  if (!gptTranscript && !Array.isArray(assemblyAITranscriptOrWords)) {
    logger.error(`[${fileId}] Invalid arguments for PWER calculation`)
    return 0
  }

  if (Array.isArray(assemblyAITranscriptOrWords) && !gptTranscript) {
    logger.info(`[${fileId}] Calculating PWER using low confidence word count`)
    const words = assemblyAITranscriptOrWords
    const threshold = config.asr.low_confidence_threshold
    const lowConfidenceWords = words.filter(
      (word: Word) => word.confidence < threshold
    )

    const pwer = lowConfidenceWords.length / Math.max(words.length, 1)
    const roundedPWER = parseFloat(pwer.toFixed(2))

    logger.info(
      `[${fileId}] PWER calculated as ${roundedPWER} using low confidence threshold ${threshold} (low confidence words: ${lowConfidenceWords.length}, total words: ${words.length})`
    )
    return roundedPWER
  }

  logger.info(
    `[${fileId}] Calculating PWER using diff-based word error rate between transcripts`
  )

  const assemblyAITranscript = assemblyAITranscriptOrWords as string

  const prepareTranscriptForComparison = (
    text: string,
    isAssemblyAI: boolean
  ): string => {
    if (isAssemblyAI) {
      text = text.replace(
        new RegExp(`${TIMESTAMP_SPEAKER_PATTERN.source}\\s*`, 'g'),
        ''
      )
    }

    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const cleanAssemblyAI = prepareTranscriptForComparison(
    assemblyAITranscript,
    true
  )
  const cleanGPT = prepareTranscriptForComparison(
    gptTranscript as string,
    false
  )

  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(cleanAssemblyAI, cleanGPT)

  dmp.diff_cleanupSemantic(diffs)

  let insertions = 0
  let deletions = 0
  let substitutions = 0
  let index = 0

  while (index < diffs.length) {
    const currentOp = diffs[index][0]
    const currentText = diffs[index][1]

    const wordCount = currentText.trim().split(/\s+/).length

    if (currentOp === -1) {
      if (index + 1 < diffs.length && diffs[index + 1][0] === 1) {
        const nextText = diffs[index + 1][1]
        const nextWordCount = nextText.trim().split(/\s+/).length

        const minCount = Math.min(wordCount, nextWordCount)
        substitutions += minCount

        if (wordCount > nextWordCount) {
          deletions += wordCount - nextWordCount
        }

        index += 2
        continue
      } else {
        deletions += wordCount
      }
    } else if (currentOp === 1) {
      insertions += wordCount
    }

    index++
  }

  const totalErrors = insertions + deletions + substitutions
  const assemblyAIWords = cleanAssemblyAI.split(/\s+/)
  const referenceLength = Math.max(assemblyAIWords.length, 1)
  const pwer = totalErrors / referenceLength
  const roundedPWER = parseFloat(pwer.toFixed(2))

  logger.info(
    `[${fileId}] PWER calculated as ${roundedPWER} using diff-based approach (insertions: ${insertions}, deletions: ${deletions}, substitutions: ${substitutions}, reference word count: ${referenceLength})`
  )
  return roundedPWER
}

function isPwerAboveThreshold(
  pwer: number,
  fileId: string
): {
  requiresManualScreening: boolean
  screeningReason?: string | null
} {
  logger.info(
    `[${fileId}] Checking if transcript requires manual screening - PWER: ${pwer}`
  )

  const threshold = config.asr.pwer_threshold
  const requiresManualScreening = pwer > threshold

  let screeningReason: string | null = null

  if (requiresManualScreening) {
    screeningReason = `PWER ${pwer} > ASR PWER THRESHOLD ${threshold} - High error rate detected, requires manual screening`
  }

  logger.info(
    `[${fileId}] Transcript quality check: ${
      requiresManualScreening ? 'NEEDS SCREENING' : 'ACCEPTABLE'
    }${screeningReason ? ` - ${screeningReason}` : ''}`
  )
  return { requiresManualScreening, screeningReason }
}

export async function POST(req: NextRequest) {
  // Authenticate webhook and check rate limit
  const authResult = await authenticateWebhook(req, 'ASR-WORKER')
  if (authResult.error) return authResult.error

  const asrResult = await req.json()

  try {
    if (!asrResult || !asrResult.fileId) {
      return NextResponse.json({ error: 'Invalid ASR result' }, { status: 400 })
    }

    const { words, gptTranscript, ASRElapsedTime, fileId, asrStats } = asrResult

    const order = await prisma.order.findUnique({
      where: { fileId },
    })
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const assemblyAICTMs = getCTMs(words)
    const assemblyAITranscript = getFormattedTranscript(assemblyAICTMs)
    let ctms = assemblyAICTMs

    let combinedTranscript = assemblyAITranscript
    if (gptTranscript) {
      logger.info(
        `[${fileId}] GPT transcript available, creating combined transcript`
      )
      combinedTranscript = createCombinedTranscript(
        assemblyAITranscript,
        gptTranscript,
        fileId
      )

      if (combinedTranscript !== assemblyAITranscript) {
        const assemblyAIAlignments = createAlignments(
          assemblyAITranscript,
          assemblyAICTMs
        )
        const alignments = updateAlignments(
          combinedTranscript,
          assemblyAIAlignments,
          assemblyAICTMs
        )

        ctms = alignments
          .filter((alignment) => alignment.type === 'ctm')
          .map((alignment) => {
            const ctm = {
              start: alignment.start,
              end: alignment.end,
              word: alignment.word.toLowerCase().replace(/[^\w\s]/g, ''),
              conf: alignment.conf,
              punct: alignment.punct,
              source: 'assembly_ai',
              speaker: alignment.speaker,
              ...(alignment.turn && { turn: alignment.turn }),
            }
            return ctm
          })
      }
    } else {
      logger.info(
        `[${fileId}] No GPT transcript available, using AssemblyAI transcript only`
      )
    }

    const formattingCheckResult = checkCombinedASRFormat(
      combinedTranscript,
      fileId
    )

    await axios.post(
      `${FILE_CACHE_URL}/save-transcript`,
      {
        fileId: fileId,
        transcript: combinedTranscript,
        ctms: ctms,
        userId: order.userId,
        assemblyAITranscript: assemblyAITranscript,
        gptTranscript: gptTranscript,
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )

    const pwer = gptTranscript
      ? calculatePWER(assemblyAITranscript, fileId, gptTranscript)
      : calculatePWER(words, fileId)

    const qualityCheck = isPwerAboveThreshold(pwer, fileId)
    if (qualityCheck.requiresManualScreening) {
      await prisma.order.update({
        where: { fileId },
        data: {
          ASRTimeTaken: ASRElapsedTime,
          pwer: pwer,
          reportMode: ReportMode.AUTO,
          reportOption: ReportOption.AUTO_PWER_ABOVE_THRESHOLD,
          reportComment: qualityCheck.screeningReason,
          status: OrderStatus.SUBMITTED_FOR_SCREENING,
          combinedASRFormatValidation: formattingCheckResult,
        },
      })
    } else {
      await prisma.order.update({
        where: { fileId },
        data: {
          ASRTimeTaken: ASRElapsedTime,
          pwer: pwer,
          status: OrderStatus.TRANSCRIBED,
          updatedAt: new Date(),
          combinedASRFormatValidation: formattingCheckResult,
        },
      })
    }

    try {
      await prisma.aSRProcessStats.create({
        data: {
          fileId: fileId,
          orderId: order.id,
          assemblyAIStartTime: new Date(asrStats.assemblyAIStartTime),
          assemblyAIEndTime: new Date(asrStats.assemblyAIEndTime),
          assemblyAITimeTaken: asrStats.assemblyAITimeTaken,
          chunkingStartTime: asrStats.chunkingStartTime
            ? new Date(asrStats.chunkingStartTime)
            : null,
          chunkingEndTime: asrStats.chunkingEndTime
            ? new Date(asrStats.chunkingEndTime)
            : null,
          chunkingTimeTaken: asrStats.chunkingTimeTaken,
          gpt4oTranscribeStartTime: asrStats.gpt4oTranscribeStartTime
            ? new Date(asrStats.gpt4oTranscribeStartTime)
            : null,
          gpt4oTranscribeEndTime: asrStats.gpt4oTranscribeEndTime
            ? new Date(asrStats.gpt4oTranscribeEndTime)
            : null,
          gpt4oTranscribeTimeTaken: asrStats.gpt4oTranscribeTimeTaken,
          totalASRTimeTaken: ASRElapsedTime,
        },
      })
      logger.info(`[${fileId}] Saved ASR process stats to database`)
    } catch (statsError) {
      logger.error(
        `[${fileId}] Failed to save ASR process stats: ${statsError}. Continuing with order update.`
      )
    }

    logger.info(`[${fileId}] ASR webhook processed successfully`)
    return NextResponse.json(
      {
        success: true,
        pwer,
        hasGptTranscript: !!gptTranscript,
        status: qualityCheck.requiresManualScreening
          ? 'SUBMITTED_FOR_SCREENING'
          : 'TRANSCRIBED',
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error(
      `[${asrResult?.fileId}] Error processing ASR webhook: ${error}`
    )
    return NextResponse.json(
      {
        error: `Error processing ASR webhook for file ID ${asrResult?.fileId}`,
      },
      { status: 500 }
    )
  }
}
