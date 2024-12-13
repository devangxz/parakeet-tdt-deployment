'use server'

import path from 'path'

import SpellChecker from 'simple-spellchecker'

import logger from '@/lib/logger'

interface Dictionary {
  isMisspelled: (word: string) => boolean
  getSuggestions: (word: string) => string[]
}

// Dictionary loading function
async function loadDictionary(lang = 'en-US'): Promise<Dictionary> {
  return new Promise((resolve, reject) => {
    SpellChecker.getDictionary(
      lang,
      path.join(process.cwd(), 'dictionaries'),
      (err: Error | null, dictionary: Dictionary) => {
        if (err) {
          logger.error(`Failed to load dictionary: ${err.message}`)
          reject(err)
        } else {
          resolve(dictionary)
        }
      }
    )
  })
}

export async function spellcheckAction(transcript: string) {
  try {
    const dictionary = await loadDictionary()
    const words = transcript
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
      .split(/\s+/)
    const misspelledWords = words.reduce(
      (acc: { word: string; suggestions: string[] }[], word: string) => {
        if (
          !/\d/.test(word) &&
          dictionary.isMisspelled(word.toLowerCase()) &&
          !acc.find((item) => item.word === word)
        ) {
          acc.push({
            word: word,
            suggestions: dictionary.getSuggestions(word),
          })
        }
        return acc
      },
      []
    )
    logger.info(`Sent misspelled words`)
    return {
      success: true,
      data: misspelledWords,
    }
  } catch (error) {
    logger.error(`Spellcheck failed: ${error}`)
    return {
      success: false,
      error: 'Spellcheck failed',
    }
  }
}
