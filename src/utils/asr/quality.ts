import { Word } from 'assemblyai'

import config from '../../../config.json'
import logger from '@/lib/logger'
import { diff_match_patch } from '@/utils/transcript/diff_match_patch'

const TIMESTAMP_SPEAKER_PATTERN = new RegExp(config.asr.timestamp_speaker_pattern)

export function calculatePWER(
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

export function isPwerAboveThreshold(
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
    screeningReason = `The PWER value of ${pwer} is above the acceptable threshold of ${threshold}`
  }

  logger.info(
    `[${fileId}] Transcript quality check: ${
      requiresManualScreening ? 'NEEDS SCREENING' : 'ACCEPTABLE'
    }${screeningReason ? ` - ${screeningReason}` : ''}`
  )
  return { requiresManualScreening, screeningReason }
}
