import { FileTag } from '@prisma/client'

import { secondsToTs } from '../secondsToTs'
import { getTranscriptByTagAction } from '@/app/actions/editor/get-transcript-by-tag'
import { CTMType } from '@/types/editor'

export async function getFormattedTranscript(
  ctms: CTMType[],
  fileId: string
): Promise<string> {
  let transcript = await getTranscriptByTagAction(fileId, FileTag.AUTO)
  if (transcript) {
    return applyTextReplacements(transcript)
  }

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

  transcript = paragraphs.join('\n\n')
  return applyTextReplacements(transcript)
}

export function applyTextReplacements(transcript: string): string {
  const text = transcript
    .replace(/(\d+) percent/g, '$1 %')
    .replace(/(\d+) dollars?/g, '$ $1')

  const capitalize = (match: string, letter: string) =>
    match[0] + ' ' + letter.toUpperCase()
  const capitalizeAfterEllipsis = (match: string) =>
    '... ' + match[1].toUpperCase()

  return text
    .replace(/[.:?!] ([a-z])/g, capitalize)
    .replace(/,$/gm, '.')
    .replace(/\.\.\. ([a-z])/g, capitalizeAfterEllipsis)
}
