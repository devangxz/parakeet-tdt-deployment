'use client'

import { useEffect, useRef } from 'react'
import { tinykeys } from 'tinykeys'

import { getUserOS } from './getUserOS'
import {
  getUserEditorSettingsAction,
  updateShortcutAction,
  updateMultipleShortcutsAction,
  restoreDefaultShortcutsAction,
} from '@/app/actions/editor/settings'

const isMac = getUserOS() === 'Mac OS'
let configCount = 0

interface DefaultShortcuts {
  togglePlay: string
  pause: string
  skipAudioBackwardsBy3Seconds: string
  skipAudioBackwardsBy5Seconds: string
  skipAudioBackwardsBy8Seconds: string
  skipAudioBackwardsBy10Seconds: string
  skipAudioBackwardsBy15Seconds: string
  skipAudioForwardBy3Seconds: string
  skipAudioForwardBy10Seconds: string
  jumpAudioAndCursorForwardBy3Seconds: string
  playAudioAtCursorPosition: string
  insertTimestampBlankAtCursorPosition: string
  insertTimestampAndSpeaker: string
  googleSearchSelectedWord: string
  defineSelectedWord: string
  increaseFontSize: string
  decreaseFontSize: string
  repeatLastFind: string
  // focusGotoTimestampTextBox: string;
  // scrollToTheStartOfFile: string;
  // scrollToTheEndOfFile: string;
  increaseVolume: string
  decreaseVolume: string
  // focusOnVolumeTextBox: string;
  increasePlaybackSpeed: string
  decreasePlaybackSpeed: string
  setPlaybackRateTo150: string
  decreasePlaybackRateBy25: string
  increasePlaybackRateBy25: string
  // focusOnPlaybackSpeedTextBox: string;
  playAudioFromTheStartOfCurrentParagraph: string
  capitalizeFirstLetter: string
  uppercaseWord: string
  lowercaseWord: string
  playAt75Speed: string
  playAt100Speed: string
  // playFromStartOfNextParagraph: string;
  // playFromStartOfPreviousParagraph: string;
  // moveLeftByACharacter: string;
  // moveLeftByAWord: string;
  // selectLeftByACharacter: string;
  // selectLeftByAWord: string;
  // moveDownByALine: string;
  // moveToTheEndOfTheCurrentLine: string;
  // selectDownByALine: string;
  // selectTillTheEndOfTheCurrentLine: string;
  // moveUpByALine: string;
  // moveToTheStartOfTheCurrentLine: string;
  // selectUpByALine: string;
  // selectTillTheStartOfTheCurrentLine: string;
  // moveRightByACharacter: string;
  // moveRightByAWord: string;
  // selectRightByACharacter: string;
  // selectRightByAWord: string;
  // moveToTheBeginningOfNextWord: string;
  // moveToTheBeginningOfPreviousWord: string;
  // selectLeftToTheBeginningOfPreviousWord: string;
  // selectRightToTheBeginningOfNextWord: string;
  // scrollCurrentParagraphToTop: string;
  // scrollCurrentParagraphToCenter: string;
  playNextBlank: string
  playPreviousBlank: string
  // undoLastEdit: string;
  // redoLastEdit: string;
  findNextOccurrenceOfString: string
  // repeatLastFind: string;
  findThePreviousOccurrenceOfString: string
  editAllOccurrencesOfString: string;
  // focusFindStringTextBox: string;
  // focusReplaceStringTextBox: string;
  replaceNextOccurrenceOfString: string
  replaceAllOccurrencesOfString: string
  saveChanges: string
  joinWithNextParagraph: string
  // saveALocalCopyOfTheTranscriptInBrowser: string;
  // showChangeSpeakerInitialsDialog: string;
  // automaticallySwapSpeakerInitialsBetweenTwoPartFileDelimiters: string;
  // closeDialogAndFocusOnEditor: string;
  // downloadTranscript: string;
  // jumpToNextAudioBookmark: string;
  // jumpToPreviousAudioBookmark: string;
  // goToStartOfAudio: string;
  // goToEndOfAudio: string;
  // increaseFontSize: string;
  // decreaseFontSize: string;
  // capitalizeFirstLetterOfEachWordInSelection: string;
  // searchWordUnderCursor: string;
  // defineWordUnderCursor: string;
  // whitelistPhraseContainingSelectedWord: string;
  // blacklistPhraseContainingSelectedWord: string;
  // jumpAudioAndCursorToARandomParagraphInCurrentPart: string;
  // jumpAudioAndCursorToARandomParagraphInNextPart: string;
  // toggleTabCompletion: string;
  // breakParagraphAndAddTimestampAndSpeakerInitial: string;
  // markTheStartOfASection: string;
  // markExaminee: string;
  // insertSwearInLine: string;
  scrollUpEditorContent: string
  scrollDownEditorContent: string
  multiEdit: string
}

export interface ShortcutControls {
  togglePlay: () => void
  pause: () => void
  skipAudio: (seconds: number) => void
  jumpAudioAndCursorForwardBy3Seconds: () => void
  playAudioAtCursorPosition: () => void
  insertTimestampBlankAtCursorPosition: () => void
  insertTimestampAndSpeaker: () => void
  googleSearchSelectedWord: () => void
  defineSelectedWord: () => void
  increaseFontSize: () => void
  decreaseFontSize: () => void
  repeatLastFind: () => void
  // focusGotoTimestampTextBox: () => void;
  // scrollToTheStartOfFile: () => void;
  // scrollToTheEndOfFile: () => void;
  increaseVolume: () => void
  decreaseVolume: () => void
  // focusOnVolumeTextBox: () => void;
  increasePlaybackSpeed: () => void
  decreasePlaybackSpeed: () => void
  setPlaybackRateTo150: () => void
  decreasePlaybackRateBy25: () => void
  increasePlaybackRateBy25: () => void
  // focusOnPlaybackSpeedTextBox: () => void;
  playAudioFromTheStartOfCurrentParagraph: () => void
  playNextBlankInstance: () => void
  playPreviousBlankInstance: () => void
  playCurrentParagraphInstance: () => void
  adjustTimestampsInstance: () => void
  capitalizeFirstLetter: () => void
  uppercaseWord: () => void
  lowercaseWord: () => void
  joinWithNextParagraph: () => void
  playAt75Speed: () => void
  playAt100Speed: () => void
  // playFromStartOfNextParagraph: () => void;
  // playFromStartOfPreviousParagraph: () => void;
  // moveLeftByACharacter: () => void;
  // moveLeftByAWord: () => void;
  // selectLeftByACharacter: () => void;
  // selectLeftByAWord: () => void;
  // moveDownByALine: () => void;
  // moveToTheEndOfTheCurrentLine: () => void;
  // selectDownByALine: () => void;
  // selectTillTheEndOfTheCurrentLine: () => void;
  // moveUpByALine: () => void;
  // moveToTheStartOfTheCurrentLine: () => void;
  // selectUpByALine: () => void;
  // selectTillTheStartOfTheCurrentLine: () => void;
  // moveRightByACharacter: () => void;
  // moveRightByAWord: () => void;
  // selectRightByACharacter: () => void;
  // selectRightByAWord: () => void;
  // moveToTheBeginningOfNextWord: () => void;
  // moveToTheBeginningOfPreviousWord: () => void;
  // selectLeftToTheBeginningOfPreviousWord: () => void;
  // selectRightToTheBeginningOfNextWord: () => void;
  // scrollCurrentParagraphToTop: () => void;
  // scrollCurrentParagraphToCenter: () => void;
  playNextBlank: () => void
  playPreviousBlank: () => void
  // undoLastEdit: () => void;
  // redoLastEdit: () => void;
  findNextOccurrenceOfString: () => void
  // repeatLastFind: () => void;
  findThePreviousOccurrenceOfString: () => void
  editAllOccurrencesOfString: () => void;
  multiEdit: () => void;
  // focusFindStringTextBox: () => void;
  // focusReplaceStringTextBox: () => void;
  replaceNextOccurrenceOfString: () => void
  replaceAllOccurrencesOfString: () => void
  saveChanges: () => void
  // saveALocalCopyOfTheTranscriptInBrowser: () => void;
  // showChangeSpeakerInitialsDialog: () => void;
  // automaticallySwapSpeakerInitialsBetweenTwoPartFileDelimiters: () => void;
  // closeDialogAndFocusOnEditor: () => void;
  // downloadTranscript: () => void;
  // jumpToNextAudioBookmark: () => void;
  // jumpToPreviousAudioBookmark: () => void;
  // goToStartOfAudio: () => void;
  // goToEndOfAudio: () => void;
  // increaseFontSize: () => void;
  // decreaseFontSize: () => void;
  // capitalizeFirstLetterOfEachWordInSelection: () => void;
  // searchWordUnderCursor: () => void;
  // defineWordUnderCursor: () => void;
  // whitelistPhraseContainingSelectedWord: () => void;
  // blacklistPhraseContainingSelectedWord: () => void;
  // jumpAudioAndCursorToARandomParagraphInCurrentPart: () => void;
  // jumpAudioAndCursorToARandomParagraphInNextPart: () => void;
  // toggleTabCompletion: () => void;
  // joinWithNextParagraph: () => void;
  // breakParagraphAndAddTimestampAndSpeakerInitial: () => void;
  // markTheStartOfASection: () => void;
  // markExaminee: () => void;
  // insertSwearInLine: () => void;
  scrollUpEditorContent: () => void
  scrollDownEditorContent: () => void
}

export const defaultShortcuts: DefaultShortcuts = {
  togglePlay: 'Control+P',
  pause: 'F3',
  skipAudioBackwardsBy3Seconds: 'F8',
  skipAudioBackwardsBy5Seconds: 'F4',
  skipAudioBackwardsBy8Seconds: 'Control+Alt+Shift+O',
  skipAudioBackwardsBy10Seconds: 'F6',
  skipAudioBackwardsBy15Seconds: 'F5',
  skipAudioForwardBy3Seconds: 'F9',
  skipAudioForwardBy10Seconds: 'F7',
  jumpAudioAndCursorForwardBy3Seconds: 'Shift+F9',
  playAudioAtCursorPosition: 'Shift+F10',
  insertTimestampBlankAtCursorPosition: 'F12',
  insertTimestampAndSpeaker: 'Shift+F12',
  googleSearchSelectedWord: isMac ? 'Alt+ß' : 'Alt+S',
  defineSelectedWord: isMac ? 'Alt+ð' : 'Alt+D',
  increaseFontSize: 'Control+Shift+ArrowUp',
  decreaseFontSize: 'Control+Shift+ArrowDown',
  repeatLastFind: 'Control+G',
  capitalizeFirstLetter: 'Control+Alt+U',
  uppercaseWord: 'Control+U',
  lowercaseWord: 'Control+L',
  // focusGotoTimestampTextBox: "Control+M",
  // scrollToTheStartOfFile: "Control+ArrowLeft",
  // scrollToTheEndOfFile: "Control+ArrowRight",
  increaseVolume: 'Alt+ArrowUp',
  decreaseVolume: 'Alt+ArrowDown',
  // focusOnVolumeTextBox: "Control+Alt+V",
  increasePlaybackSpeed: 'Control+Alt+ArrowUp',
  decreasePlaybackSpeed: 'Control+Alt+ArrowDown',
  setPlaybackRateTo150: 'F1',
  decreasePlaybackRateBy25: 'Shift+F1',
  increasePlaybackRateBy25: 'Control+F1',
  playAudioFromTheStartOfCurrentParagraph: 'Control+N',
  joinWithNextParagraph: 'Alt+J',
  playAt75Speed: 'Control+Q',
  playAt100Speed: 'Control+W',
  // playFromStartOfNextParagraph: "Control+Shift+N",
  // playFromStartOfPreviousParagraph: "Control+Alt+Shift+N",
  // moveLeftByACharacter: "Control+H",
  // moveLeftByAWord: "Control+Alt+H",
  // selectLeftByACharacter: "Control+Shift+H",
  // selectLeftByAWord: "Control+Alt+Shift+H",
  // moveDownByALine: "Control+J",
  // moveToTheEndOfTheCurrentLine: "Control+Alt+J",
  // selectDownByALine: "Control+Shift+J",
  // selectTillTheEndOfTheCurrentLine: "Control+Alt+Shift+J",
  // moveUpByALine: "Control+K",
  // moveToTheStartOfTheCurrentLine: "Control+Alt+K",
  // selectUpByALine: "Control+Shift+K",
  // selectTillTheStartOfTheCurrentLine: "Control+Alt+Shift+K",
  // moveRightByACharacter: "Control+L",
  // moveRightByAWord: "Control+Alt+L",
  // selectRightByACharacter: "Control+Shift+L",
  // selectRightByAWord: "Control+Alt+Shift+L",
  // moveToTheBeginningOfNextWord: "Control+W",
  // moveToTheBeginningOfPreviousWord: "Control+Alt+W",
  // selectLeftToTheBeginningOfPreviousWord: "Control+Shift+W",
  // selectRightToTheBeginningOfNextWord: "Control+Alt+Shift+W",
  // scrollCurrentParagraphToTop: "Control+Alt+Shift+T",
  // scrollCurrentParagraphToCenter: "Control+Alt+Shift+C",
  playNextBlank: 'Control+B',
  playPreviousBlank: 'Control+Shift+B',
  // undoLastEdit: "Control+Z",
  // redoLastEdit: "Control+Y",
  findNextOccurrenceOfString: 'Control+F',
  // repeatLastFind: "Control+G",
  findThePreviousOccurrenceOfString: 'Control+Shift+G',
  editAllOccurrencesOfString: "Control+Alt+G",
  multiEdit: "Control+Shift+Q",
  // focusFindStringTextBox: "Alt+1",
  // focusReplaceStringTextBox: "Alt+2",
  replaceNextOccurrenceOfString: 'Control+R',
  replaceAllOccurrencesOfString: 'Control+Shift+R',
  saveChanges: 'Control+S',
  // saveALocalCopyOfTheTranscriptInBrowser: "Control+D",
  // showChangeSpeakerInitialsDialog: "Control+I",
  // automaticallySwapSpeakerInitialsBetweenTwoPartFileDelimiters: "Control+Shift+I",
  // closeDialogAndFocusOnEditor: "Escape",
  // downloadTranscript: "Control+Enter",
  // jumpToNextAudioBookmark: "Control+Alt+B",
  // jumpToPreviousAudioBookmark: "Control+Alt+Shift+B",
  // goToStartOfAudio: "Control+Alt+ArrowLeft",
  // goToEndOfAudio: "Control+Alt+ArrowRight",
  // increaseFontSize: "Control+Shift+ArrowUp",
  // decreaseFontSize: "Control+Shift+ArrowDown",
  // capitalizeFirstLetterOfEachWordInSelection: "Control+Alt+U",
  // whitelistPhraseContainingSelectedWord: "Alt+W",
  // blacklistPhraseContainingSelectedWord: "Alt+B",
  // jumpAudioAndCursorToARandomParagraphInCurrentPart: "Alt+R",
  // jumpAudioAndCursorToARandomParagraphInNextPart: "Alt+F",
  // toggleTabCompletion: "Alt+Shift+T",
  // joinWithNextParagraph: "Alt+J",
  // breakParagraphAndAddTimestampAndSpeakerInitial: "Alt+Enter",
  // markTheStartOfASection: "Control+Shift+M",
  // markExaminee: "Control+Shift+E",
  // insertSwearInLine: "Control+Shift+S"
  scrollDownEditorContent: 'Control+ArrowDown',
  scrollUpEditorContent: 'Control+ArrowUp',
}

const setShortcut = async (
  action: keyof DefaultShortcuts,
  key: string
): Promise<void> => {
  await updateShortcutAction(action, key)
  configCount++
}

const getAllShortcuts = async (): Promise<
  { key: string; shortcut: string }[]
> => {
  try {
    const response = await getUserEditorSettingsAction()
    const shortcuts = {
      ...defaultShortcuts,
      ...(response.success && response.settings?.shortcuts),
    }

    return Object.entries(shortcuts).map(([key, shortcut]) => ({
      key,
      shortcut,
    }))
  } catch (error) {
    return Object.entries(defaultShortcuts).map(([key, shortcut]) => ({
      key,
      shortcut,
    }))
  }
}

const restoreDefaultShortcuts = async (): Promise<void> => {
  await restoreDefaultShortcutsAction()
}

async function migrateShortcutsFromLocalStorageToDB(): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    const shortcutsJson = localStorage.getItem('shortcuts')
    if (!shortcutsJson) {
      return
    }

    const shortcuts = JSON.parse(shortcutsJson)
    if (!shortcuts || typeof shortcuts !== 'object') {
      localStorage.removeItem('shortcuts')
      return
    }

    const response = await getUserEditorSettingsAction()
    const existingShortcuts = response.success
      ? response.settings?.shortcuts || {}
      : {}

    const validShortcuts: Record<string, string> = {}
    for (const [action, shortcut] of Object.entries(shortcuts)) {
      if (
        typeof action === 'string' &&
        typeof shortcut === 'string' &&
        action.length > 0 &&
        shortcut.length > 0 &&
        defaultShortcuts[action as keyof DefaultShortcuts] !== shortcut &&
        !existingShortcuts[action]
      ) {
        validShortcuts[action] = shortcut
      }
    }

    if (Object.keys(validShortcuts).length > 0) {
      const mergedShortcuts = {
        ...validShortcuts,
        ...existingShortcuts,
      }
      await updateMultipleShortcutsAction(mergedShortcuts)
    }

    localStorage.removeItem('shortcuts')
  } catch (error) {
    return
  }
}

const useShortcuts = (shortcutControls: ShortcutControls) => {
  const shortcutsRef = useRef<Record<string, () => void>>({})

  useEffect(() => {
    let mounted = true

    const initializeShortcuts = async () => {
      try {
        await migrateShortcutsFromLocalStorageToDB()

        const response = await getUserEditorSettingsAction()
        if (!mounted) return

        const shortcutsData = {
          ...defaultShortcuts,
          ...(response.success && response.settings?.shortcuts),
        }

        const shortcuts = Object.entries(shortcutsData).reduce(
          (acc, [key, shortcut]) => {
            const handleSkipAudio =
              (seconds: number): (() => void) =>
              () => {
                if (shortcutControls?.skipAudio) {
                  shortcutControls.skipAudio(seconds)
                }
              }

            switch (key) {
              case 'skipAudioBackwardsBy3Seconds':
                acc[shortcut] = handleSkipAudio(-3)
                break
              case 'skipAudioBackwardsBy5Seconds':
                acc[shortcut] = handleSkipAudio(-5)
                break
              case 'skipAudioBackwardsBy8Seconds':
                acc[shortcut] = handleSkipAudio(-8)
                break
              case 'skipAudioBackwardsBy10Seconds':
                acc[shortcut] = handleSkipAudio(-10)
                break
              case 'skipAudioBackwardsBy15Seconds':
                acc[shortcut] = handleSkipAudio(-15)
                break
              case 'skipAudioForwardBy3Seconds':
                acc[shortcut] = handleSkipAudio(3)
                break
              case 'skipAudioForwardBy10Seconds':
                acc[shortcut] = handleSkipAudio(10)
                break
              case 'jumpAudioAndCursorForwardBy3Seconds':
                acc[shortcut] = handleSkipAudio(3)
                break
              default:
                const controlKey = key as keyof ShortcutControls
                if (controlKey in shortcutControls) {
                  const handler = shortcutControls[controlKey]
                  if (typeof handler === 'function') {
                    acc[shortcut] = () => {
                      if (handler) {
                        ;(handler as () => void)()
                      }
                    }
                  }
                }
            }
            return acc
          },
          {} as Record<string, () => void>
        )

        shortcutsRef.current = shortcuts

        const unsubscribe = tinykeys(
          window,
          Object.entries(shortcuts).reduce((acc, [key, func]) => {
            acc[key] = (event: KeyboardEvent) => {
              if (
                document.activeElement?.getAttribute('data-shortcut-input') ===
                'true'
              ) {
                return
              }
              event.preventDefault()
              func()
            }
            return acc
          }, {} as Record<string, (event: KeyboardEvent) => void>)
        )

        return unsubscribe
      } catch (error) {
        return undefined
      }
    }

    let cleanup: (() => void) | undefined
    initializeShortcuts().then((unsubscribe) => {
      if (unsubscribe) cleanup = unsubscribe
    })

    return () => {
      mounted = false
      if (cleanup) cleanup()
    }
  }, [shortcutControls, configCount])

  return shortcutsRef.current
}

export { setShortcut, getAllShortcuts, restoreDefaultShortcuts, useShortcuts }
export default DefaultShortcuts
