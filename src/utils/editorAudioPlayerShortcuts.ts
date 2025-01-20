'use client'

import { useEffect, useRef } from 'react';
import { tinykeys } from "tinykeys";

import { getUserOS } from './getUserOS';

const isMac = getUserOS() === 'Mac OS';

let configCount = 0;
interface DefaultShortcuts {
    togglePlay: string;
    pause: string;
    skipAudioBackwardsBy3Seconds: string;
    skipAudioBackwardsBy5Seconds: string;
    skipAudioBackwardsBy8Seconds: string;
    skipAudioBackwardsBy10Seconds: string;
    skipAudioBackwardsBy15Seconds: string;
    skipAudioForwardBy3Seconds: string;
    skipAudioForwardBy10Seconds: string;
    jumpAudioAndCursorForwardBy3Seconds: string;
    playAudioAtCursorPosition: string;
    insertTimestampBlankAtCursorPosition: string;
    insertTimestampAndSpeakerInitialAtStartOfCurrentLine: string;
    googleSearchSelectedWord: string;
    defineSelectedWord: string;
    increaseFontSize: string;
    decreaseFontSize: string;
    repeatLastFind: string;
    // focusGotoTimestampTextBox: string;
    // scrollToTheStartOfFile: string;
    // scrollToTheEndOfFile: string;
    increaseVolume: string;
    decreaseVolume: string;
    // focusOnVolumeTextBox: string;
    increasePlaybackSpeed: string;
    decreasePlaybackSpeed: string;
    // focusOnPlaybackSpeedTextBox: string;
    playAudioFromTheStartOfCurrentParagraph: string;
    capitalizeFirstLetter: string;
    uppercaseWord: string;
    lowercaseWord: string;

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
    playNextBlank: string;
    playPreviousBlank: string;
    // undoLastEdit: string;
    // redoLastEdit: string;
    findNextOccurrenceOfString: string;
    // repeatLastFind: string;
    findThePreviousOccurrenceOfString: string;
    // findAllOccurrencesOfString: string;
    // focusFindStringTextBox: string;
    // focusReplaceStringTextBox: string;
    replaceNextOccurrenceOfString: string;
    replaceAllOccurrencesOfString: string;
    saveChanges: string;
    joinWithNextParagraph: string;
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
}

export interface ShortcutControls {
    togglePlay: () => void;
    pause: () => void;
    skipAudio: (seconds: number) => void;
    jumpAudioAndCursorForwardBy3Seconds: () => void;
    playAudioAtCursorPosition: () => void;
    insertTimestampBlankAtCursorPosition: () => void;
    insertTimestampAndSpeakerInitialAtStartOfCurrentLine: () => void;
    googleSearchSelectedWord: () => void;
    defineSelectedWord: () => void;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    repeatLastFind: () => void;
    // focusGotoTimestampTextBox: () => void;
    // scrollToTheStartOfFile: () => void;
    // scrollToTheEndOfFile: () => void;
    increaseVolume: () => void;
    decreaseVolume: () => void;
    // focusOnVolumeTextBox: () => void;
    increasePlaybackSpeed: () => void;
    decreasePlaybackSpeed: () => void;
    // focusOnPlaybackSpeedTextBox: () => void;
    playAudioFromTheStartOfCurrentParagraph: () => void;
    playNextBlankInstance: () => void;
    playPreviousBlankInstance: () => void;
    playCurrentParagraphInstance: () => void;
    adjustTimestampsInstance: () => void;
    capitalizeFirstLetter: () => void;
    uppercaseWord: () => void;
    lowercaseWord: () => void;
    joinWithNextParagraph: () => void;
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
    playNextBlank: () => void;
    playPreviousBlank: () => void;
    // undoLastEdit: () => void;
    // redoLastEdit: () => void;
    findNextOccurrenceOfString: () => void;
    // repeatLastFind: () => void;
    findThePreviousOccurrenceOfString: () => void;
    // findAllOccurrencesOfString: () => void;
    // focusFindStringTextBox: () => void;
    // focusReplaceStringTextBox: () => void;
    replaceNextOccurrenceOfString: () => void;
    replaceAllOccurrencesOfString: () => void;
    saveChanges: () => void;
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
}

const defaultShortcuts: DefaultShortcuts = {
    togglePlay: "Control+P",
    pause: "F3",
    skipAudioBackwardsBy3Seconds: "F8",
    skipAudioBackwardsBy5Seconds: "F4",
    skipAudioBackwardsBy8Seconds: "Control+Alt+Shift+O",
    skipAudioBackwardsBy10Seconds: "F6",
    skipAudioBackwardsBy15Seconds: "F5",
    skipAudioForwardBy3Seconds: "F9",
    skipAudioForwardBy10Seconds: "F7",
    jumpAudioAndCursorForwardBy3Seconds: "Shift+F9",
    playAudioAtCursorPosition: "Shift+F10",
    insertTimestampBlankAtCursorPosition: "F12",
    insertTimestampAndSpeakerInitialAtStartOfCurrentLine: "Shift+F12",
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
    increaseVolume: "Alt+ArrowUp",
    decreaseVolume: "Alt+ArrowDown",
    // focusOnVolumeTextBox: "Control+Alt+V",
    increasePlaybackSpeed: "Control+Alt+ArrowUp",
    decreasePlaybackSpeed: "Control+Alt+ArrowDown",
    // focusOnPlaybackSpeedTextBox: "Control+Alt+S",
    playAudioFromTheStartOfCurrentParagraph: "Control+N",
    joinWithNextParagraph: "Alt+J",
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
    playNextBlank: "Control+B",
    playPreviousBlank: "Control+Shift+B",
    // undoLastEdit: "Control+Z",
    // redoLastEdit: "Control+Y",
    findNextOccurrenceOfString: "Control+F",
    // repeatLastFind: "Control+G",
    findThePreviousOccurrenceOfString: "Control+Shift+G",
    // findAllOccurrencesOfString: "Control+Alt+G",
    // focusFindStringTextBox: "Alt+1",
    // focusReplaceStringTextBox: "Alt+2",
    replaceNextOccurrenceOfString: "Control+R",
    replaceAllOccurrencesOfString: "Control+Shift+R",
    saveChanges: "Control+S",
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
    // searchWordUnderCursor: "Alt+S",
    // defineWordUnderCursor: "Alt+D",
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
};

const setShortcut = (action: keyof DefaultShortcuts, key: string): void => {
    const shortcutsJson = localStorage.getItem('shortcuts');
    const shortcuts = shortcutsJson ? JSON.parse(shortcutsJson) : { ...defaultShortcuts };
    shortcuts[action] = key;
    localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
    configCount++;
};

const getAllShortcuts = (): { key: string, shortcut: string }[] => {
    const shortcutsJson = localStorage.getItem('shortcuts');
    const loadedShortcuts = shortcutsJson ? JSON.parse(shortcutsJson) : defaultShortcuts;
    return Object.entries(loadedShortcuts).map(([action, key]) => ({
        key: action,
        shortcut: key as string
    }));
};

const restoreDefaultShortcuts = (): void => {
    localStorage.setItem('shortcuts', JSON.stringify(defaultShortcuts));
};

const useShortcuts = (shortcutControls: ShortcutControls) => {
    const shortcutsRef = useRef<Record<string, () => void>>({});

    useEffect(() => {
        const shortcuts = getAllShortcuts().reduce((acc, { shortcut, key }) => {
            const skipAudioWrapper = (seconds: number) => {
                if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                    shortcutControls.skipAudio(seconds);
                } else {
                    console.error('shortcutControls.skipAudio is not a function', shortcutControls);
                }
            };

            switch (key) {
                case 'skipAudioBackwardsBy3Seconds':
                    acc[shortcut] = () => {
                        if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                            shortcutControls.skipAudio(-3)
                        }
                    };
                    break;
                case 'skipAudioBackwardsBy5Seconds':
                    acc[shortcut] = () => {
                        if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                            shortcutControls.skipAudio(-5)
                        }
                    };
                    break;
                case 'skipAudioBackwardsBy8Seconds':
                    acc[shortcut] = () => {
                        if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                            shortcutControls.skipAudio(-8)
                        }
                    };
                    break;
                case 'skipAudioBackwardsBy10Seconds':
                    acc[shortcut] = () => {
                        if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                            shortcutControls.skipAudio(-10)
                        }
                    };
                    break;
                case 'skipAudioBackwardsBy15Seconds':
                    acc[shortcut] = () => {
                        if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                            shortcutControls.skipAudio(-15)
                        }
                    };
                    break;
                case 'skipAudioForwardBy3Seconds':
                    acc[shortcut] = () => {
                        if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                            shortcutControls.skipAudio(3)
                        }
                    };
                    break;
                case 'jumpAudioAndCursorForwardBy3Seconds':
                    acc[shortcut] = () => {
                        if (shortcutControls && typeof shortcutControls.skipAudio === 'function') {
                            shortcutControls.skipAudio(3)
                        }
                    };
                    break;
                case 'skipAudioForwardBy10Seconds':
                    acc[shortcut] = () => skipAudioWrapper(10);
                    break;
                default:
                    const controlKey = key as keyof ShortcutControls;
                    if (controlKey in shortcutControls) {
                        acc[shortcut] = shortcutControls[controlKey] as () => void;
                    }
            }
            return acc;
        }, {} as Record<string, () => void>);

        shortcutsRef.current = shortcuts;

        const unsubscribe = tinykeys(window, Object.entries(shortcuts).reduce((acc, [key, func]) => {
            acc[key] = (event: KeyboardEvent) => {
                // Ignore shortcuts if the shortcut configuration input is focused
                if (document.activeElement?.getAttribute('data-shortcut-input') === 'true') {
                    return;
                }

                event.preventDefault();
                func();
            };
            return acc;
        }, {} as Record<string, (event: KeyboardEvent) => void>));

        return () => {
            unsubscribe();
        };
    }, [shortcutControls, configCount]);

    return shortcutsRef.current;
};

export { setShortcut, getAllShortcuts, restoreDefaultShortcuts, useShortcuts };
export default DefaultShortcuts;
