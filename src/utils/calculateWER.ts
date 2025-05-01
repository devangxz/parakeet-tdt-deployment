import config from '../../config.json'
import { diff_match_patch } from '@/utils/transcript/diff_match_patch'

const TIMESTAMP_SPEAKER_PATTERN = new RegExp(
  config.asr.timestamp_speaker_pattern
)

export function calculateWER(
  originalTranscript: string,
  modifiedTranscript: string
): number {
  const prepareTranscriptForComparison = (text: string): string => {
    text = text.replace(
      new RegExp(`${TIMESTAMP_SPEAKER_PATTERN.source}\\s*`, 'g'),
      ''
    )

    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"]/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const cleanOriginal = prepareTranscriptForComparison(originalTranscript)
  const cleanModified = prepareTranscriptForComparison(modifiedTranscript)

  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(cleanOriginal, cleanModified)

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
  const originalWords = cleanOriginal.split(/\s+/)
  const referenceLength = Math.max(originalWords.length, 1)
  const wer = totalErrors / referenceLength
  const roundedWER = parseFloat(wer.toFixed(2))

  return roundedWER
}
