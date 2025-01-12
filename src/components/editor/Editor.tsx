'use client'

import { Op } from 'quill/core'
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { OrderDetails } from '@/app/editor/[fileId]/page'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import { CTMType, CustomerQuillSelection, insertTimestampAndSpeakerInitialAtStartOfCurrentLine, insertTimestampBlankAtCursorPosition, } from '@/utils/editorUtils'
import { createAlignments, getFormattedTranscript, AlignmentType } from '@/utils/transcript'
import { diff_match_patch, DIFF_DELETE, DIFF_INSERT } from '@/utils/transcript/diff_match_patch';

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

interface DeltaOperation {
  insert?: string;  // Removed object type since we only handle text
  delete?: number;
  retain?: number;
}

interface Delta {
  ops: DeltaOperation[];
}

type Sources = 'user' | 'api' | 'silent';

export default function Editor({ transcript, ctms: initialCtms, audioPlayer, getQuillRef, orderDetails, content, setContent, setSelectionHandler, selection, searchHighlight }: EditorProps) {
    const ctms = initialCtms; // Make CTMs constant
    const quillRef = useRef<ReactQuill>(null)
    const [alignments, setAlignments] = useState<AlignmentType[]>([])
    const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)

    // Keep track of earliest & latest changed offset across the entire typing burst
    const [minChangedOffset, setMinChangedOffset] = useState<number | null>(null)
    const [maxChangedOffset, setMaxChangedOffset] = useState<number | null>(null)

    // Core alignment update logic
    const isPunctuation = (word: string): boolean => {
        return /^[.,!?;:]$/.test(word);
    };

    const processAlignmentUpdate = useCallback((newText: string, currentAlignments: AlignmentType[]): AlignmentType[] => {
        if (currentAlignments.length === 0) return [];

        // Convert alignments to text for diffing
        const oldText = currentAlignments.map(a => a.word).join(' ');
        
        // Use diff_match_patch in word mode
        const dmp = new diff_match_patch();
        const rawDiffs = dmp.diff_wordMode(oldText, newText);
        
        // Convert dmp output to match { type, value }
        const diffs = rawDiffs.map(([op, text]) => {
            if (op === DIFF_DELETE) {
                return { type: 'removed', value: text };
            } else if (op === DIFF_INSERT) {
                return { type: 'added', value: text };
            }
            return { type: 'unchanged', value: text };
        });
        
        // Create new alignments array
        const newAlignments: AlignmentType[] = [];
        let alignmentIndex = 0;
        let lastRemovedAlignment: AlignmentType | null = null;
        
        diffs.forEach((part) => {
            console.log("Diff part:", part);
            
            if (part.type === 'removed') {
                // Store removed word info for potential replacement
                const removedWords = part.value.trim()
                    .split(/\s+/)
                    .filter(w => w.length > 0);
                lastRemovedAlignment = removedWords.length === 1 ? currentAlignments[alignmentIndex] : null;
                alignmentIndex += removedWords.length;
            } else if (part.type === 'added') {
                // Add new words
                const newWords = part.value.trim().split(/\s+/).filter(w => w.length > 0);
                
                // Check if this is a direct word replacement
                const isReplacement = lastRemovedAlignment && 
                    newWords.length === 1;
                
                if (isReplacement) {
                    // Use timing from the removed word
                    newAlignments.push({
                        word: newWords[0],
                        type: 'edit',
                        start: lastRemovedAlignment!.start,
                        end: lastRemovedAlignment!.end,
                        conf: 1.0,
                        punct: newWords[0],
                        source: 'user',
                        speaker: lastRemovedAlignment!.speaker,
                        turn: lastRemovedAlignment!.turn
                    });
                } else {
                    // Handle as new insertion
                    const prevAlignment = alignmentIndex > 0 ? currentAlignments[alignmentIndex - 1] : null;
                    const nextAlignment = currentAlignments[alignmentIndex] || currentAlignments[currentAlignments.length - 1];
                    
                    newWords.forEach((word, idx) => {
                        if (isPunctuation(word)) {
                            // For punctuation, create meta alignment with same start/end time
                            const start = prevAlignment ? prevAlignment.end : (nextAlignment ? nextAlignment.start : 0);
                            
                            newAlignments.push({
                                word,
                                type: 'meta', // Set type as meta for punctuation
                                start: start,
                                end: start, // Same as start for punctuation
                                conf: 1.0,
                                punct: word,
                                source: 'user',
                                speaker: nextAlignment.speaker,
                                turn: nextAlignment.turn
                            });
                        } else {
                            // Regular word - interpolate timing with 10ms gaps
                            let start, end;
                            if (!prevAlignment) {
                                // At the start - use next word timing minus gap
                                start = nextAlignment.start - ((newWords.length - idx) * 0.01);
                                end = start + 0.01;
                            } else if (!nextAlignment) {
                                // At the end - use previous word timing plus gap
                                start = prevAlignment.end + (idx * 0.01);
                                end = start + 0.01;
                            } else {
                                // In between words - interpolate with gaps
                                const timeGap = nextAlignment.start - prevAlignment.end;
                                const wordDuration = timeGap / (newWords.length + 1);
                                start = prevAlignment.end + (wordDuration * (idx + 1));
                                end = start + 0.01;
                            }

                            newAlignments.push({
                                word,
                                type: 'edit',
                                start,
                                end,
                                conf: 1.0,
                                punct: word,
                                source: 'user',
                                speaker: nextAlignment.speaker,
                                turn: nextAlignment.turn
                            });
                        }
                    });
                }
                lastRemovedAlignment = null;
            } else {
                // Keep unchanged words
                const unchangedWords = part.value.trim().split(/\s+/).filter(w => w.length > 0);
                unchangedWords.forEach(() => {
                    newAlignments.push(currentAlignments[alignmentIndex]);
                    alignmentIndex++;
                });
            }
        });
        
        return newAlignments;
    }, []); // No dependencies needed

    const quillModules = {
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

    const findMatchingBoundary = (
        newWords: string[],
        alignments: AlignmentType[],
        endIdx: number
    ): number => {
        // Search backwards from end to find last matching occurrence
        const lastTwoNew = newWords.slice(-2).join(' ');

        let searchIdx = Math.min(alignments.length - 1, endIdx + 1);
        while (searchIdx > 1) {
            const lastTwoOld = alignments.slice(searchIdx - 1, searchIdx + 1)
                .map(a => a.word)
                .join(' ');
            if (lastTwoOld === lastTwoNew) break;
            searchIdx--;
        }
        return searchIdx;
    };
        
    useEffect(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        const handleTextChange = (delta: Delta, oldDelta: Delta, source: Sources) => {
            if (source !== 'user') return;
            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            // Track changed region
            let retainChars = 0;
            let changeLength = 0;
            
            delta.ops.forEach((op: DeltaOperation) => {
                if (op.retain) {
                    retainChars += op.retain;
                }
                if (op.insert) {
                    changeLength += op.insert.length;
                }
                if (op.delete) {
                    changeLength += op.delete;
                }
            });

            console.log('Delta:', delta);
            
            if (minChangedOffset === null || retainChars < minChangedOffset) {
                setMinChangedOffset(retainChars);
            }
            const endPos = retainChars + changeLength;
            if (maxChangedOffset === null || endPos > maxChangedOffset) {
                setMaxChangedOffset(endPos);
            }

            if (typingTimer) clearTimeout(typingTimer);
            setTypingTimer(
                setTimeout(() => {
                    console.log('No new keystrokes for 1s, performing partial alignment update...');

                    if (minChangedOffset === null || maxChangedOffset === null) return;

                    const rawText = quill.getText();
                    const normalizedText = rawText.replace(/\n+/g, ' ');
                    const newWords = normalizedText.split(/\s+/).filter(Boolean);
                    
                    let startIndex = characterIndexToWordIndex(normalizedText, minChangedOffset) - 2;
                    if (startIndex < 0) startIndex = 0;
                    
                    let endIndex = characterIndexToWordIndex(normalizedText, maxChangedOffset) + 2;
                    if (endIndex >= newWords.length) {
                        endIndex = newWords.length - 1;
                    }

                    // Start search near end position to find correct word boundary
                    // when buffer words appear multiple times in text
                    const oldEndIndex = findMatchingBoundary(
                        newWords.slice(startIndex, endIndex + 1),
                        alignments,
                        endIndex + 1
                    );
                                            
                    const changedWords = newWords.slice(startIndex, endIndex + 1).join(' ');
                    const affectedAlignments = alignments.slice(startIndex, oldEndIndex + 1);
                
                    console.log('Changed Words:', changedWords);
                    console.log('Affected Alignments:', affectedAlignments.map(a => a.word).join(' '));
                
                    const updatedSlice = processAlignmentUpdate(changedWords, affectedAlignments);
                    const newAlignments = [
                        ...alignments.slice(0, startIndex),
                        ...updatedSlice,
                        ...alignments.slice(oldEndIndex + 1)
                    ];
                
                    setAlignments(newAlignments);
                    console.log('Alignments updated:', newAlignments);

                    setMinChangedOffset(null);
                    setMaxChangedOffset(null);
                }, 1000)
            );
        };

        quill.on('text-change', handleTextChange)

        return () => {
            quill.off('text-change', handleTextChange)
            if (typingTimer) {
                clearTimeout(typingTimer)
            }
        }
    }, [
        alignments,
        maxChangedOffset,
        minChangedOffset,
        typingTimer
    ])

    useEffect(() => {
        initEditor()
    }, [initEditor])

    // Create initial alignments once when component loads
    useEffect(() => {
        if (ctms.length > 0) {
            const originalTranscript = getFormattedTranscript(ctms);
            const newAlignments = createAlignments(originalTranscript, ctms);
            setAlignments(newAlignments);

            console.log('Initial Alignments:', newAlignments);

            if(transcript) {
                // Process any differences between original and current transcript
                const updatedAlignments = processAlignmentUpdate(transcript, newAlignments);
                setAlignments(updatedAlignments); // Set the processed alignments
                console.log('Alignments updated:', updatedAlignments);

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

        // Apply blue background to selected text
        quill.formatText(selection.index, selection.length, {
            background: '#D9D9D9'
        })
    }

    const handleFocus = () => {
        const quill = quillRef.current?.getEditor()
        if (!quill || !selection) return

        // Remove blue background from selected text
        quill.formatText(selection.index, selection.length, {
            background: null
        })

        // Remove search highlight if exists
        if (searchHighlight) {
            quill.formatText(searchHighlight.index, searchHighlight.length, {
                background: null
            })
        }
    }

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
