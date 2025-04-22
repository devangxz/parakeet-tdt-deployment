import logger from '@/lib/logger'

export function checkCombinedASRFormat(transcript: string, fileId: string) {
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
          message: `The paragraph does not follow the required structure: 'HH:MM:SS.s S#: Text'. Please ensure the paragraph starts correctly with a timestamp and speaker identifier, followed by the text.`,
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
