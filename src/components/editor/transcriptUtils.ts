// transcriptUtils.ts

import { diffWords, Change } from 'diff'
//import { LineData, CTMSWord } from './types' // Assuming you've moved the interfaces to a separate types file

export interface CTMSWord {
  start: number
  end: number
  word: string
  punct: string
  index: number
  speaker: string
  // Add other fields as needed
}

export interface WordData {
  word: string
  ctms?: CTMSWord
}

export interface LineData {
  content: { insert: string }[]
  words: WordData[]
}

export interface TranscriptResponse {
  result: {
    transcript: string
    ctms: CTMSWord[]
  }
}

const interpolateNewWordTiming = (
  prevWordEnd: number,
  nextWordStart: number,
  numWordsAdded: number,
  index: number
): { start: number; end: number } => {
  const timeStep = (nextWordStart - prevWordEnd) / (numWordsAdded + 1)
  return {
    start: prevWordEnd + timeStep * (index + 1),
    end: prevWordEnd + timeStep * (index + 2),
  }
}

const createCtmWordForAddedWord = (
  word: string,
  timing: { start: number; end: number },
  index: number,
  speaker: string
): CTMSWord => ({
  start: timing.start,
  end: timing.end,
  index,
  word,
  punct: '',
  speaker,
})

const createCtmWordForUnchangedWord = (
  word: string,
  index: number,
  existingCtms?: CTMSWord
): CTMSWord => ({
  start: existingCtms?.start ?? 0,
  end: existingCtms?.end ?? 0,
  index,
  word,
  punct: existingCtms?.punct ?? '',
  speaker: existingCtms?.speaker ?? '',
})

const processAddedWords = (
  words: string[],
  prevWordEnd: number,
  nextWordStart: number,
  startIndex: number,
  prevSpeaker: string
): CTMSWord[] => words.map((word, i) => {
  const timing = interpolateNewWordTiming(
    prevWordEnd,
    nextWordStart,
    words.length,
    i
  )
  return createCtmWordForAddedWord(word, timing, startIndex + i, prevSpeaker)
})

const processUnchangedWords = (
  words: string[],
  startIndex: number,
  existingCtmsWords: WordData[]
): CTMSWord[] => words.map((word, i) =>
  createCtmWordForUnchangedWord(
    word,
    startIndex + i,
    existingCtmsWords[i]?.ctms
  )
)

export const updateContent = (
  quillContent: string,
  lines: LineData[]
): CTMSWord[] => {
  const oldContent = lines
    .map((line) => line.words.map((w) => w.word).join(' '))
    .join('\n\n')

  const differences = diffWords(oldContent, quillContent)
  const flatLines = lines.flatMap((l) => l.words)

  let updatedCtms: CTMSWord[] = []
  let index = 0
  let ctmIndex = 0

  differences.forEach((item: Change) => {
    const words = item.value.split(/\s+/).filter((w) => w.length > 0)

    if (item.removed) {
      ctmIndex += words.length
      return
    }

    if (item.added) {
      const prevWordEnd =
        ctmIndex > 0 ? flatLines[ctmIndex - 1]?.ctms?.end ?? 0 : 0
      const nextWordStart = flatLines[ctmIndex]?.ctms?.start ?? prevWordEnd + 1
      const prevSpeaker =
        flatLines[Math.max(0, ctmIndex - 1)]?.ctms?.speaker ?? ''

      const newWords = processAddedWords(
        words,
        prevWordEnd,
        nextWordStart,
        index,
        prevSpeaker
      )
      updatedCtms = updatedCtms.concat(newWords)
      index += words.length
    } else {
      const unchangedWords = processUnchangedWords(
        words,
        index,
        flatLines.slice(ctmIndex)
      )
      updatedCtms = updatedCtms.concat(unchangedWords)
      index += words.length
      ctmIndex += words.length
    }

    if (ctmIndex >= flatLines.length) {
      return
    }
  })

  console.log('Content updated:', updatedCtms)
  return updatedCtms
}

export const saveCTMData = (ctmData: CTMSWord[]): void => {
  const ctmJson = JSON.stringify(ctmData, null, 2)
  const blob = new Blob([ctmJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ctm_data.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}