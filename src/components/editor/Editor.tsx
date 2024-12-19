'use client'

//import { diffWords } from 'diff'
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { LineData, CTMSWord, WordData } from './transcriptUtils'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import { ConvertedASROutput, convertSecondsToTimestamp, insertTimestampBlankAtCursorPosition, } from '@/utils/editorUtils'

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
    orderDetails: OrderDetails
    content: { insert: string }[]
    setContent: (content: { insert: string }[]) => void
    getLines: (lineData: LineData[]) => void
}

export default function Editor({ transcript, ctms, audioPlayer, duration, getQuillRef, orderDetails, content, setContent, getLines }: EditorProps) {
    const quillRef = useRef<ReactQuill>(null)
    const [lines, setLines] = useState<LineData[]>([])
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

            setLines(newLines)
            return newCtms_local
        },
        []
    )

    const initEditor = useCallback(async () => {
        processTranscript(transcript, ctms)
        const quill = quillRef.current?.getEditor()
        if (!quill) return
        quill.container.style.fontSize = '16px'
    }, [processTranscript, transcript, ctms])

    const handleContentChange = useCallback(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return
        const text = quill.getText()
        setContent([{ insert: text }])
        localStorage.setItem('transcript', JSON.stringify({ [orderDetails.fileId]: text }))
    }, [])

    const handleEditorClick = useCallback(() => {
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

    const insertTimestampBlankAtCursorPositionInstance = useCallback(() => {
        insertTimestampBlankAtCursorPosition(audioPlayer, quillRef.current?.getEditor());
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

        // Check for existing timestamp and speaker pattern at start of line
        const lineText = quill.getText(paragraphStart, 14); // Get enough text to check pattern
        const timestampSpeakerPattern = /^\d{1}:\d{2}:\d{2}\.\d{1} S\d+: /;

        console.log(lineText)
        console.log(timestampSpeakerPattern)

        if (timestampSpeakerPattern.test(lineText)) {
            // If pattern exists, delete it before inserting new one
            const match = lineText.match(timestampSpeakerPattern);
            if (match) {
                quill.deleteText(paragraphStart, match[0].length);
            }
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

    const adjustFontSize = useCallback((increase: boolean) => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const container = quill.container as HTMLElement;
        const currentSize = parseInt(window.getComputedStyle(container).fontSize);
        if (increase) {
            container.style.fontSize = `${currentSize + 2}px`;
        } else {
            container.style.fontSize = `${currentSize - 2}px`;
        }
    }, [quillRef])

    const shortcutControls = useMemo(() => {
        const controls: Partial<ShortcutControls> = {
            playAudioAtCursorPosition: handlePlayAudioAtCursorPositionShortcut,
            insertTimestampBlankAtCursorPosition: insertTimestampBlankAtCursorPositionInstance,
            insertTimestampAndSpeakerInitialAtStartOfCurrentLine,
            googleSearchSelectedWord,
            defineSelectedWord,
            increaseFontSize: () => adjustFontSize(true),
            decreaseFontSize: () => adjustFontSize(false)

        };
        return controls as ShortcutControls;
    }, [handlePlayAudioAtCursorPositionShortcut, insertTimestampBlankAtCursorPosition, insertTimestampAndSpeakerInitialAtStartOfCurrentLine]);

    useShortcuts(shortcutControls);

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
        if (!content.length) {
            setContent([{ insert: transcript }])
        }
        getLines(lines)
    }, [lines])

    useEffect(() => {
        getQuillRef(quillRef)
    }, [quillRef])

    return (
        <>
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