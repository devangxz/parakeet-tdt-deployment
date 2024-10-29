'use client'

//import { diffWords } from 'diff'
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { LineData, CTMSWord, WordData } from './transcriptUtils'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import { ConvertedASROutput, convertSecondsToTimestamp, } from '@/utils/editorUtils'

// TODO:  Add valid values (start, end, duration, speaker) for the changed words.
// TODO: Test if a new line is added with TS + speaker name
// TODO: A meta text is added, this should have empty ctm
// TODO: Problem with updates near punctuation marks
interface EditorProps {
    transcript: string
    ctms: ConvertedASROutput[]
    audioPlayer: HTMLAudioElement | null
    duration: number
    getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
    getCtms: (ctms: CTMSWord[]) => void
    disableGoToWord: boolean
    orderDetails: OrderDetails
    content: { insert: string }[]
    setContent: (content: { insert: string }[]) => void
}

export default function Editor({ transcript, ctms, audioPlayer, duration, getQuillRef, getCtms, disableGoToWord, orderDetails, content, setContent }: EditorProps) {
    const quillRef = useRef<ReactQuill>(null)
    const [lines, setLines] = useState<LineData[]>([])
    const [newCtms, setNewCtms] = useState<CTMSWord[]>([])
    const workerRef = useRef<Worker | null>(null)
    const quillModules = {
        toolbar: false,
    }

    //let ctms: CTMSWord[] = []

    const processTranscript = useCallback(
        (transcript: string, ctms: CTMSWord[]) => {
            const textLines = transcript.split('\n')
            const newLines: LineData[] = []
            let ctmsIndex = 0
            let wordIndex = 0

            const newCtms_local: CTMSWord[] = []

            textLines.forEach((line) => {
                const lineContent: { insert: string }[] = []
                const lineWords: WordData[] = []
                const words = line.split(/\s+/)

                //let speaker = ''
                for (let i = 0; i < words.length; i++) {
                    if (words[i] != '') {
                        const wordData: WordData = { word: words[i] }
                        if (i < 2) {
                            wordData.ctms = {
                                start: 0,
                                end: 0,
                                word: words[i],
                                punct: '',
                                index: wordIndex,
                                speaker: '',
                            }
                            // if (i === 1 && wordData.word) {
                            //   // Ensure wordData.ctms is defined
                            //   speaker = wordData.word
                            // }
                        } else {
                            wordData.ctms = ctms[ctmsIndex]
                            wordData.ctms.index = wordIndex
                            //wordData.ctms.speaker = speaker
                            ctmsIndex += 1
                        }
                        newCtms_local.push(wordData.ctms)
                        lineWords.push(wordData)
                        lineContent.push({ insert: words[i] })
                        if (i < words.length - 1) {
                            lineContent.push({ insert: ' ' })
                        }
                        wordIndex++
                    }
                }

                lineContent.push({ insert: '\n' })
                newLines.push({ content: lineContent, words: lineWords })
            })

            setNewCtms(newCtms_local)
            setLines(newLines)
            return newCtms_local
        },
        []
    )

    const initEditor = useCallback(async () => {
        processTranscript(transcript, ctms)
    }, [processTranscript, transcript, ctms])

    const handleUpdateContent = useCallback(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        const newContent = quill.getText()

        if (workerRef.current) {
            workerRef.current.postMessage({ quillContent: newContent, lines });
        }
    }, [lines])

    useEffect(() => {
        workerRef.current = new Worker(new URL('../../utils/updateContentWorker.ts', import.meta.url));

        workerRef.current.onmessage = (event) => {
            const updatedCtms = event.data;
            setNewCtms(updatedCtms);
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const handleContentChange = useCallback(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return
        const text = quill.getText()
        setContent([{ insert: text }])
    }, [])

    const handleEditorClick = useCallback(() => {
        handleUpdateContent()
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        const clickPosition = quill.getSelection()?.index
        if (clickPosition === undefined) return

        let currentPosition = 0
        for (const line of lines) {
            for (const wordData of line.words) {
                const wordEnd = currentPosition + wordData.word.length
                if (clickPosition >= currentPosition && clickPosition < wordEnd) {
                    if (wordData.ctms && audioPlayer) {
                        audioPlayer.currentTime = wordData.ctms.start;
                    }
                    return
                }
                currentPosition = wordEnd + 1 // +1 for the space
            }
            currentPosition++ // +1 for the newline
        }
    }, [lines, duration, audioPlayer])

    const handlePlayAudioAtCursorPositionShortcut = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const currentSelection = quill.getSelection();
        if (!currentSelection) return;

        const text = quill.getText();
        const cursorPosition = currentSelection.index;

        let wordStart = cursorPosition;
        let wordEnd = cursorPosition;

        while (wordStart > 0 && text[wordStart - 1] !== ' ' && text[wordStart - 1] !== '\n') {
            wordStart--;
        }

        while (wordEnd < text.length && text[wordEnd] !== ' ' && text[wordEnd] !== '\n') {
            wordEnd++;
        }

        quill.setSelection(wordStart, wordEnd - wordStart);
        handleEditorClick();
    }, [handleEditorClick]);

    const insertTimestampBlankAtCursorPosition = useCallback(() => {
        if (!audioPlayer || !quillRef.current) return;

        const quill = quillRef.current.getEditor();
        const currentTime = audioPlayer.currentTime;

        const hours = Math.floor(currentTime / 3600);
        const minutes = Math.floor((currentTime % 3600) / 60);
        const seconds = Math.floor(currentTime % 60);
        const milliseconds = Math.floor((currentTime % 1) * 10);

        const formattedTime = ` [${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds}] ____`;

        const cursorPosition = quill.getSelection()?.index || 0;
        quill.insertText(cursorPosition, formattedTime);
        // quill.formatText(cursorPosition, formattedTime.length, { color: 'red' });

        quill.setSelection(cursorPosition + formattedTime.length, 0);
    }, [audioPlayer]);

    const insertTimestampAndSpeakerInitialAtStartOfCurrentLine = useCallback(() => {
        if (!audioPlayer || !quillRef.current) return;

        const quill = quillRef.current.getEditor();
        const currentTime = audioPlayer.currentTime;

        const formattedTime = convertSecondsToTimestamp(currentTime);

        const currentSelection = quill.getSelection();

        let paragraphStart = currentSelection ? currentSelection.index : 0;
        while (paragraphStart > 0 && quill.getText(paragraphStart - 1, 1) !== '\n') {
            paragraphStart--;
        }

        quill.insertText(paragraphStart, formattedTime + ' S1: ', 'user');

        if (currentSelection) {
            quill.setSelection(currentSelection.index + formattedTime.length, currentSelection.length);
        }
    }, [audioPlayer]);

    const googleSearchSelectedWord = useCallback(() => {
        if (!quillRef.current) return;

        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();

        if (!selection) return;

        const selectedText = quill.getText(selection.index, selection.length);

        if (selectedText.trim()) {
            const searchQuery = encodeURIComponent(selectedText.trim());
            const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
            window.open(googleSearchUrl, '_blank');
        }
    }, [quillRef]);

    const defineSelectedWord = useCallback(() => {
        if (!quillRef.current) return;

        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();

        if (!selection) return;

        const selectedText = quill.getText(selection.index, selection.length);

        if (selectedText.trim()) {
            const searchQuery = encodeURIComponent(selectedText.trim());
            const googleSearchUrl = `https://www.google.com/search?q=define: ${searchQuery}`;
            window.open(googleSearchUrl, '_blank');
        }
    }, [quillRef]);

    const adjustFontSize = (increase: boolean) => {
        if (!quillRef.current) return;

        const quill = quillRef.current.getEditor();
        const container = quill.container as HTMLElement;
        const currentSize = parseInt(window.getComputedStyle(container).fontSize);
        if (increase) {
            container.style.fontSize = `${currentSize + 2}px`;
        } else {
            container.style.fontSize = `${currentSize - 2}px`;
        }
    }

    const increaseFontSize = () => adjustFontSize(true);
    const decreaseFontSize = () => adjustFontSize(false);

    const shortcutControls = useMemo(() => {
        const controls: Partial<ShortcutControls> = {
            playAudioAtCursorPosition: handlePlayAudioAtCursorPositionShortcut,
            insertTimestampBlankAtCursorPosition,
            insertTimestampAndSpeakerInitialAtStartOfCurrentLine,
            googleSearchSelectedWord,
            defineSelectedWord,
            increaseFontSize,
            decreaseFontSize

        };
        return controls as ShortcutControls;
    }, [handlePlayAudioAtCursorPositionShortcut, insertTimestampBlankAtCursorPosition, insertTimestampAndSpeakerInitialAtStartOfCurrentLine]);

    useShortcuts(shortcutControls);

    const handleTimeUpdate = () => {
        if (!audioPlayer || disableGoToWord) return;
        const currentTime = audioPlayer.currentTime;
        let cumulativeLength = 0;
        for (const line of lines) {
            for (const wordData of line.words) {
                const wordStart = wordData.ctms?.start || 0;
                const wordEnd = wordData.ctms?.end || 0;
                if (currentTime >= wordStart && currentTime <= wordEnd) {
                    const quill = quillRef.current?.getEditor();
                    if (quill) {
                        const textLength = cumulativeLength + wordData.word.length;
                        quill.setSelection(textLength, 0, 'silent');
                        // Scroll the selected text into view if not visible
                        quill.scrollIntoView();
                    } return;
                }
                cumulativeLength += wordData.word.length + 1;
            }
        }
    };

    useEffect(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        audioPlayer?.addEventListener('seeked', handleTimeUpdate);

        return () => {
            audioPlayer?.removeEventListener('seeked', handleTimeUpdate);
        };
    }, [audioPlayer, lines, handleTimeUpdate]);

    useEffect(() => {
        initEditor()
    }, [initEditor])

    useEffect(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return
        const doubleClickHandler = (event: MouseEvent) => {
            if (event.altKey && event.type === 'dblclick') {
                handleEditorClick()
            }
        }
        quill.root.addEventListener('dblclick', doubleClickHandler)

        return () => {
            if (quill) {
                quill.root.removeEventListener('dblclick', doubleClickHandler)
            }
        }
    }, [handleEditorClick])

    useEffect(() => {
        getCtms(newCtms)
    }, [newCtms, getCtms])

    useEffect(() => {
        if (!content.length) {
            setContent([{ insert: transcript }])
        }
    }, [lines])

    useEffect(() => {
        getQuillRef(quillRef)
    }, [quillRef])

    return (
        <>
            {/* <button onClick={() => {
                const quill = quillRef.current?.getEditor();
                if (!quill) return;
                navigateAndPlayBlanks(quill, audioPlayer, setDisableGoToWord)
            }}>play n blank</button>
            <button onClick={() => {
                const quill = quillRef.current?.getEditor();
                if (!quill) return;
                navigateAndPlayBlanks(quill, audioPlayer, setDisableGoToWord, true)
            }}>play p blank</button>
            <button onClick={() => {
                const quill = quillRef.current?.getEditor();
                if (!quill) return;
                adjustTimestamps(quill, newCtms, setNewCtms, 60)
            }}>adjust</button>
            <button onClick={() => {
                const quill = quillRef.current?.getEditor();
                if (!quill || !audioPlayer) return;
                playCurrentParagraphTimestamp(quill, audioPlayer, setDisableGoToWord)
            }}>play c w</button> */}
            <ReactQuill
                ref={quillRef}
                theme='snow'
                modules={quillModules}
                value={{ ops: content }}
                onChange={handleContentChange}
                formats={['size']}
                className='h-full'
                readOnly={(orderDetails.status === 'FINALIZER_ASSIGNED' || orderDetails.status === "REVIEWER_ASSIGNED")}
            />

        </>

    )
}
