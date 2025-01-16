'use client'

import { Delta, Op } from 'quill/core'
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { OrderDetails } from '@/app/editor/[fileId]/page'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import { CTMType, CustomerQuillSelection, insertTimestampAndSpeakerInitialAtStartOfCurrentLine, insertTimestampBlankAtCursorPosition, } from '@/utils/editorUtils'
import { createAlignments, getFormattedTranscript, AlignmentType } from '@/utils/transcript'

// TODO:  Add valid values (start, end, duration, speaker) for the changed words.
// TODO: Test if a new line is added with TS + speaker name
// TODO: A meta text is added, this should have empty ctm
// TODO: Problem with updates near punctuation marks
interface EditorProps {
    transcript: string
    ctms: CTMType[]
    audioPlayer: HTMLAudioElement | null
    duration: number
    getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
    orderDetails: OrderDetails
    content: Op[]
    setContent: (content: Op[]) => void
    setSelectionHandler: () => void
    selection: CustomerQuillSelection | null
    searchHighlight: CustomerQuillSelection | null
}

export default function Editor({ transcript, ctms: initialCtms, audioPlayer, getQuillRef, orderDetails, content, setContent, setSelectionHandler, selection, searchHighlight }: EditorProps) {
    const ctms = initialCtms; // Make CTMs constant
    const quillRef = useRef<ReactQuill>(null)
    const [alignments, setAlignments] = useState<AlignmentType[]>([])
    const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
    const alignmentWorker = useRef<Worker | null>(null)
    const prevLineNodeRef = useRef<HTMLElement | null>(null);
    const lastHighlightedRef = useRef<number | null>(null);

    const quillModules = {
        history: {
            userOnly: true
        },        
        toolbar: false,
    }

    const characterIndexToWordIndex = (text: string, charIndex: number): number => {
        const textUpToIndex = text.slice(0, charIndex);
        return textUpToIndex.split(/\s+/).filter(word => word.trim() !== '').length;
    };

    const initEditor = useCallback(async () => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return
        quill.container.style.fontSize = '16px'
    }, [])

    const getFormattedContent = (text: string) => {
        const timestampPattern = /\[\d:\d{2}:\d{2}\.\d\]\s_{4}/g;
        const parts = text.split(/((?:\[\d:\d{2}:\d{2}\.\d\]\s_{4})|(?:\d:\d{2}:\d{2}\.\d\s+S\d+:))/g);
        const formattedContent = parts.map(part => {
            if (timestampPattern.test(part)) {
                return { insert: part, attributes: { color: '#FF0000' } };
            }
            return { insert: part };
        });

        return formattedContent.filter(part => part.insert.trim() !== '');
    }

    const handleContentChange = useCallback(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        // Get the contents as a Delta object
        const delta = quill.getContents()
        setContent(delta.ops)

        // Store the text content in localStorage
        const newText = quill.getText();
        localStorage.setItem('transcript', JSON.stringify({
            [orderDetails.fileId]: newText
        }))
    }, [orderDetails.fileId])

    useEffect(() => {
        if (!content.length) {
            const formattedContent = getFormattedContent(transcript);
            setContent(formattedContent);
        }
    }, [content.length, transcript]);

    const handleEditorClick = useCallback(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        const clickPosition = quill.getSelection()?.index
        if (clickPosition === undefined) return

        const text = quill.getText()
        const wordIndex = characterIndexToWordIndex(text, clickPosition)
        
        if (wordIndex >= 0 && wordIndex < alignments.length && audioPlayer) {
            const alignment = alignments[wordIndex]
            console.log('Playing word:', alignment.word, 'at timestamp:', alignment.start)
            audioPlayer.currentTime = alignment.start
            audioPlayer.play()
        } else {
            console.log('Skipping playback - conditions not met')
        }
    }, [alignments, audioPlayer])

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
        try {
            // Initialize the Web Worker
            alignmentWorker.current = new Worker(
                new URL('@/utils/transcript/alignmentWorker.ts', import.meta.url)
            );
      
            alignmentWorker.current.onmessage = (e) => {
                const newAlignments = e.data;
                setAlignments(newAlignments);
                console.log('Updated alignments:', newAlignments);
            };
      
            console.log('Web Worker initialized successfully.');
        } catch (error) {
            console.error('Failed to initialize Web Worker:', error);
        }
      
        return () => {
            if (alignmentWorker.current) {
                alignmentWorker.current.terminate();
                console.log('Web Worker terminated.');
            }
        };
    }, []);

    useEffect(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill || !alignmentWorker.current) return

        const handleTextChange = (delta: Delta, oldDelta: Delta, source: string) => {
            if (source !== 'user') return

            if (typingTimer) clearTimeout(typingTimer)
            setTypingTimer(
                setTimeout(() => {
                    const rawText = quill.getText()
                    alignmentWorker.current?.postMessage({
                        newText: rawText,
                        currentAlignments: alignments
                    })
                }, 1000)
            )
        }

        quill.on('text-change', handleTextChange)

        return () => {
            quill.off('text-change', handleTextChange)
            if (typingTimer) {
                clearTimeout(typingTimer)
            }
        }
    }, [alignments, typingTimer])

    function findCurrentWordIndex(alignments: AlignmentType[], time: number, lastIndex: number | null): number  {
        if (alignments.length === 0) return 0;
    
        // Find next non-meta index (includes current index)
        const findNextNonMeta = (index: number) => {
            while (index < alignments.length && alignments[index].type === 'meta') {
                index++;
            }
            return index < alignments.length ? index : null;
        };
    
        // Find previous non-meta index
        const findPrevNonMeta = (index: number) => {
            while (index >= 0 && alignments[index].type === 'meta') {
                index--;
            }
            return index >= 0 ? index : null;
        };
        
        // Sequential play optimization
        if (lastIndex !== null) {
            // If last index was meta, find next non-meta
            if (alignments[lastIndex].type === 'meta') {
                lastIndex = findNextNonMeta(lastIndex);
                if (lastIndex === null) return alignments.length - 1;
            }
    
            const lastWord = alignments[lastIndex];
            
            // Still in current word
            if (time >= lastWord.start && time < lastWord.end) {
                return lastIndex;
            }
            
            // Moving forward
            if (time >= lastWord.end) {
                const nextIndex = findNextNonMeta(lastIndex + 1);
                if (nextIndex !== null) {
                    const nextWord = alignments[nextIndex];
                    
                    // In gap between words
                    if (time < nextWord.start) {
                        const timeToLastEnd = time - lastWord.end;
                        const timeToNextStart = nextWord.start - time;
                        return timeToLastEnd < timeToNextStart ? lastIndex : nextIndex;
                    }
                    
                    // Within next word
                    if (time < nextWord.end) {
                        return nextIndex;
                    }
                }
            } else {
                // Moving backward
                const prevIndex = findPrevNonMeta(lastIndex - 1);
                if (prevIndex !== null) {
                    const prevWord = alignments[prevIndex];
                    if (time >= prevWord.start && time < prevWord.end) {
                        return prevIndex;
                    }
                }
            }
        }
        
        // Binary search
        let low = 0;
        let high = alignments.length - 1;
        
        while (low <= high) {
            const mid = (low + high) >> 1;
            // Skip meta entries in binary search
            const currentIndex = findNextNonMeta(mid);
            if (currentIndex === null) {
                high = mid - 1;
                continue;
            }
            
            const word = alignments[currentIndex];
            
            if (time >= word.start && time < word.end) {
                return currentIndex;
            }
            
            const prevIndex = findPrevNonMeta(currentIndex - 1);
            if (prevIndex !== null) {
                const prevWord = alignments[prevIndex];
                if (time >= prevWord.end && time < word.start) {
                    const prevDistance = time - prevWord.end;
                    const nextDistance = word.start - time;
                    return prevDistance < nextDistance ? prevIndex : currentIndex;
                }
            }
            
            if (time < word.start) {
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        
        // Edge cases - find first/last non-meta entries
        const firstNonMetaIndex = findNextNonMeta(0);
        if (firstNonMetaIndex !== null && time < alignments[firstNonMetaIndex].start) {
            return firstNonMetaIndex;
        }
        
        const finalWordIndex = findPrevNonMeta(alignments.length - 1);
        if (finalWordIndex !== null) {
            return finalWordIndex;
        }
        
        return 0;
    }

    // Inside your Editor component's timeUpdate handler
    useEffect(() => {
        if (!audioPlayer) return;
        
        const handleTimeUpdate = () => {            
            const quill = quillRef.current?.getEditor();
            if (!quill) return;
        
            const currentTime = audioPlayer.currentTime;
            const currentWordIndex = findCurrentWordIndex(alignments, currentTime, lastHighlightedRef.current);
            
            // Skip if same word
            if (currentWordIndex === lastHighlightedRef.current) return;
        
            // Un-highlight the old word
            if (lastHighlightedRef.current !== null) {
                const oldAl = alignments[lastHighlightedRef.current];
                if (oldAl.quillStart !== undefined && oldAl.quillEnd !== undefined) {
                    quill.formatText(oldAl.quillStart, oldAl.quillEnd - oldAl.quillStart, {
                        background: null,
                    });
                }
            }
        
            // Highlight the new word
            const newAl = alignments[currentWordIndex];
            if (newAl.quillStart !== undefined && newAl.quillEnd !== undefined) {
                quill.formatText(newAl.quillStart, newAl.quillEnd - newAl.quillStart, {
                    background: 'yellow',
                });

                const [line] = quill.getLine(newAl.quillStart);
                if (!line) return;

                const lineOffset = line.offset();
                const bounds = quill.getBounds(lineOffset);
                if (!bounds) return;
                
                const editorContainer = quill.root.closest('.ql-editor');
                if (!editorContainer) return;
                
                // Get positions relative to editor container
                const rect = line.domNode.getBoundingClientRect();
                const containerRect = editorContainer.getBoundingClientRect();
                
                // Check if line's bottom is beyond 80% of container height
                const lineBottomRelative = rect.bottom - containerRect.top;
                const threshold = containerRect.height * 0.8;
                
                if (lineBottomRelative > threshold) {
                    editorContainer.scrollTo({
                        top: editorContainer.scrollTop + bounds.top - 50, // scroll to put line near top
                        behavior: 'smooth'
                    });
                }
            }
        
            lastHighlightedRef.current = currentWordIndex;
        };

        audioPlayer.addEventListener('timeupdate', handleTimeUpdate);
        
        return () => {
            audioPlayer.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [alignments, audioPlayer]);

    useEffect(() => {
        initEditor()
    }, [initEditor])

    useEffect(() => {
        if (quillRef.current) {
            const quill = quillRef.current?.getEditor()
            quill.setSelection(0, 0)
            setTimeout(() => {
                handleCursorMove()
            }, 0)        
        }
    }, []);    

    // Create initial alignments once when component loads
    useEffect(() => {
        if (ctms.length > 0) {
            const originalTranscript = getFormattedTranscript(ctms);
            const newAlignments = createAlignments(originalTranscript, ctms);
            setAlignments(newAlignments);

            if(transcript) {
                // Process any differences between original and current transcript
                alignmentWorker.current?.postMessage({
                    newText: transcript,
                    currentAlignments: newAlignments
                })
            }
        }
    }, []) // Empty dependency array since ctms is constant

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

    useEffect(() => {
        const editor = quillRef.current?.getEditor()?.root;
        if (!editor) return;

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            const selection = quill.getSelection();
            if (!selection) return;

            // Get only the selected text
            const selectedText = quill.getText(selection.index, selection.length);
            // Clean up multiple line breaks
            const cleanText = selectedText.replace(/\n{2,}/g, '\n\n');
            e.clipboardData?.setData('text/plain', cleanText);
        };

        editor.addEventListener('copy', handleCopy);

        return () => {
            editor.removeEventListener('copy', handleCopy);
        };
    }, []);

    const handleBlur = () => {
        const quill = quillRef.current?.getEditor()
        if (!quill || !selection) return

        // Only apply highlight to selected text
        if (selection.length > 0) {
            quill.formatText(selection.index, selection.length, {
                background: '#D9D9D9'
            })
        }
    }

    // Update handleFocus to preserve line highlight
    const handleFocus = () => {
        const quill = quillRef.current?.getEditor()
        if (!quill || !selection) return

        // Only remove highlight from selected text
        if (selection.length > 0) {
            quill.formatText(selection.index, selection.length, {
                background: null
            })
        }

        // Remove search highlight if exists
        if (searchHighlight) {
            quill.formatText(searchHighlight.index, searchHighlight.length, {
                background: null
            })
        }
    }

    const handleCursorMove = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        const selection = quill.getSelection();
        if (!selection) return;

        // If the user is highlighting text, you may want to bail out:
        if (selection.length > 0) return;

        const [line] = quill.getLine(selection.index);
        if (!line) return;

        // If still in the same line as before, skip
        const currentLineDomNode = line.domNode as HTMLElement;
        if (prevLineNodeRef.current === currentLineDomNode) return;

        // Remove highlight from old line
        if (prevLineNodeRef.current) {
            prevLineNodeRef.current.classList.remove("line-highlight");
        }

        // Add highlight to the new line
        currentLineDomNode.classList.add("line-highlight");
        prevLineNodeRef.current = currentLineDomNode;
    }, []);

    useEffect(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;

        quill.on('selection-change', handleCursorMove);
        return () => {
            quill.off('selection-change', handleCursorMove);
        };
    }, [handleCursorMove]);

    // const handleTimeUpdate = (currentTime: number) => {
    //     // Handle the time update here
    //     console.log('Audio time updated:', currentTime)
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
                onChangeSelection={setSelectionHandler}
                onBlur={handleBlur}
                onFocus={handleFocus}
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
