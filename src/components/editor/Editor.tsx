'use client'

import { Op } from 'quill/core'
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { LineData, CTMSWord, WordData } from './transcriptUtils'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import { ConvertedASROutput, insertTimestampAndSpeakerInitialAtStartOfCurrentLine, insertTimestampBlankAtCursorPosition, } from '@/utils/editorUtils'

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
    content: Op[]
    setContent: (content: Op[]) => void
    getLines: (lineData: LineData[]) => void
    setSelectionHandler: () => void
}

export default function Editor({ transcript, ctms, audioPlayer, duration, getQuillRef, orderDetails, content, setContent, getLines, setSelectionHandler }: EditorProps) {
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
                        } else {
                            wordData.ctms = ctms[ctmsIndex]
                            wordData.ctms.index = wordIndex
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

    const getFormattedContent = (text: string) => {
        const timestampPattern = /\[\d:\d{2}:\d{2}\.\d\]\s_{4}/g;
        const speakerPattern = /\d:\d{2}:\d{2}\.\d\s+S\d+:/g;
        const parts = text.split(/((?:\[\d:\d{2}:\d{2}\.\d\]\s_{4})|(?:\d:\d{2}:\d{2}\.\d\s+S\d+:))/g);
        const formattedContent = parts.map(part => {
            if (timestampPattern.test(part)) {
                return { insert: part, attributes: { color: '#FF0000' } };
            } else if (speakerPattern.test(part)) {
                return { insert: part, attributes: { color: '#28a828' } };
            }
            return { insert: part };
        });

        return formattedContent.filter(part => part.insert.trim() !== '');
    }

    const handleContentChange = useCallback(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        // Get the contents as a Delta object instead of plain text
        const delta = quill.getContents()
        setContent(delta.ops)

        // Store the text content in localStorage
        localStorage.setItem('transcript', JSON.stringify({
            [orderDetails.fileId]: quill.getText()
        }))
    }, [])

    useEffect(() => {
        if (!content.length) {
            const formattedContent = getFormattedContent(transcript);
            setContent(formattedContent);
        }
        getLines(lines);
    }, [lines, content.length, transcript]);

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

    const capitalizeFirstLetter = useCallback(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();
        if (!selection) return;

        const text = quill.getText(selection.index, selection.length);
        const words = text.split(' ');
        const capitalizedWords = words.map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        );
        quill.deleteText(selection.index, selection.length);
        quill.insertText(selection.index, capitalizedWords.join(' '));
    }, [quillRef]);

    const uppercaseWord = useCallback(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();
        if (!selection) return;

        const text = quill.getText(selection.index, selection.length);
        quill.deleteText(selection.index, selection.length);
        quill.insertText(selection.index, text.toUpperCase());
    }, [quillRef]);

    const lowercaseWord = useCallback(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();
        if (!selection) return;

        const text = quill.getText(selection.index, selection.length);
        quill.deleteText(selection.index, selection.length);
        quill.insertText(selection.index, text.toLowerCase());
    }, [quillRef]);

    const joinWithNextParagraph = useCallback(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();
        if (!selection) return;

        // Get the text and find current paragraph
        const text = quill.getText();
        const lines = text.split('\n').filter(line => line.trim() !== '');

        // Find current line index
        let currentLineIndex = 0;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            charCount += lines[i].length + 1;
            if (charCount > selection.index) {
                currentLineIndex = i;
                break;
            }
        }

        const currentPara = lines[currentLineIndex];
        const nextPara = lines[currentLineIndex + 1];
        if (!currentPara || !nextPara) return;

        // Find positions
        const currentParaStart = text.indexOf(currentPara);

        // Get the timestamp and speaker pattern to remove
        const timestampMatch = nextPara.match(/^\d:\d{2}:\d{2}\.\d\s+S\d+:\s*/);
        if (!timestampMatch) return;

        // Delete the newlines between paragraphs and the timestamp/speaker
        quill.deleteText(
            currentParaStart + currentPara.length,
            2 + timestampMatch[0].length
        );

        // Insert a space between paragraphs
        quill.insertText(currentParaStart + currentPara.length, ' ');
    }, [quillRef]);

    const shortcutControls = useMemo(() => {
        const controls: Partial<ShortcutControls> = {
            playAudioAtCursorPosition: handlePlayAudioAtCursorPositionShortcut,
            insertTimestampBlankAtCursorPosition: insertTimestampBlankAtCursorPositionInstance,
            insertTimestampAndSpeakerInitialAtStartOfCurrentLine: insertTimestampAndSpeakerInitialAtStartOfCurrentLine.bind(null, audioPlayer, quillRef.current?.getEditor()),
            googleSearchSelectedWord,
            defineSelectedWord,
            capitalizeFirstLetter,
            joinWithNextParagraph,
            uppercaseWord,
            lowercaseWord,
            increaseFontSize: () => adjustFontSize(true),
            decreaseFontSize: () => adjustFontSize(false)
        };
        return controls as ShortcutControls;
    }, [handlePlayAudioAtCursorPositionShortcut,
        insertTimestampBlankAtCursorPosition,
        insertTimestampAndSpeakerInitialAtStartOfCurrentLine,
        capitalizeFirstLetter,
        uppercaseWord,
        lowercaseWord,
        joinWithNextParagraph
    ]);

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
        getQuillRef(quillRef)
    }, [quillRef])

    // const handleContextMenuSelect = useCallback((action: string) => {
    //     if (!quillRef.current) return;
    //     const quill = quillRef.current.getEditor();
    //     const selection = quill.getSelection();

    //     if (!selection) return;

    //     switch (action) {
    //         case 'google':
    //             googleSearchSelectedWord();
    //             break;
    //         case 'define':
    //             defineSelectedWord();
    //             break;
    //         case 'play-word':
    //             handleEditorClick();
    //             break;
    //     }
    // }, [googleSearchSelectedWord, defineSelectedWord, handleEditorClick]);

    // const handleContextMenuOpen = () => {
    //     if (!quillRef.current) return;
    //     const quill = quillRef.current.getEditor();

    //     // Get the clicked position relative to the editor
    //     // Get the text position from the coordinates
    //     const textPosition = quill.getSelection(true);
    //     if (!textPosition) return;

    //     // Find word boundaries
    //     const text = quill.getText();
    //     let wordStart = textPosition.index;
    //     let wordEnd = textPosition.index;

    //     // Find start of word
    //     while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
    //         wordStart--;
    //     }

    //     // Find end of word
    //     while (wordEnd < text.length && !/\s/.test(text[wordEnd])) {
    //         wordEnd++;
    //     }

    //     // Select the word
    //     quill.setSelection(wordStart, wordEnd - wordStart);
    // }

    return (
        <>
            {/* <ContextMenu>
                <ContextMenuTrigger className="w-full h-full" onContextMenu={handleContextMenuOpen}> */}
            <ReactQuill
                ref={quillRef}
                theme='snow'
                modules={quillModules}
                value={{ ops: content }}
                onChange={handleContentChange}
                formats={['size', 'background', 'font', 'color']}
                className='h-full'
                readOnly={(orderDetails.status === 'FINALIZER_ASSIGNED')}
                onChangeSelection={setSelectionHandler}
            />
            {/* </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onSelect={() => handleContextMenuSelect('play-word')}>
                        Play Word
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleContextMenuSelect('google')}>
                        Google Search
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => handleContextMenuSelect('define')}>
                        Define Word
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu> */}

        </>

    )
}