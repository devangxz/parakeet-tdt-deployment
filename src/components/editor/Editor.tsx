'use client'

import debounce from 'lodash/debounce'
import { Delta, Op } from 'quill/core'
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { OrderDetails } from '@/app/editor/[fileId]/page'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import {
  CTMType,
  CustomerQuillSelection,
  insertTimestampAndSpeaker,
  insertTimestampBlankAtCursorPosition,
  persistEditorData,
  getTranscriptFromStorage
} from '@/utils/editorUtils'
import {
  createAlignments,
  getFormattedTranscript,
  AlignmentType,
  getAlignmentIndexByTime
} from '@/utils/transcript'

interface EditorProps {
    transcript: string
    ctms: CTMType[]
    audioPlayer: HTMLAudioElement | null
    duration: number
    getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
    orderDetails: OrderDetails
    setSelectionHandler: () => void
    selection: CustomerQuillSelection | null
    searchHighlight: CustomerQuillSelection | null
    highlightWordsEnabled: boolean;
    setEditedSegments: (segments: Set<number>) => void;
}

interface UndoRedoItem {
    delta: Delta;
    oldDelta: Delta;
    beforeSelection: Range | null;
    afterSelection: Range | null;
}
 
interface Range {
    index: number;
    length: number;
}

type Sources = 'user' | 'api' | 'silent';

export default function Editor({ ctms: initialCtms, audioPlayer, getQuillRef, orderDetails, setSelectionHandler, selection, searchHighlight, highlightWordsEnabled, setEditedSegments }: EditorProps) {
    const ctms = initialCtms; // Make CTMs constant
    const quillRef = useRef<ReactQuill>(null)
    const [alignments, setAlignments] = useState<AlignmentType[]>([])
    const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
    const alignmentWorker = useRef<Worker | null>(null)
    const prevLineNodeRef = useRef<HTMLElement | null>(null);
    const lastHighlightedRef = useRef<number | null>(null);
    const [undoStack, setUndoStack] = useState<UndoRedoItem[]>([]);
    const [redoStack, setRedoStack] = useState<UndoRedoItem[]>([]);
    const beforeSelectionRef = useRef<Range | null>(null);
    const [currentSelection, setCurrentSelection] = useState<Range | null>(null);  
    const [isTyping, setIsTyping] = useState(false);  
    const [alignmentWorkerRunning, setAlignmentWorkerRunning] = useState(false);
    const TYPING_PAUSE = 500; // Half second pause indicates word completion
    const STACK_LIMIT = 100;

    const quillModules = {
        history: false,
        toolbar: false,
    };

    // Selection change handler
    const handleSelectionChange = (selection: Range | null, source: Sources) => {
        if (source === 'user') {
            beforeSelectionRef.current = currentSelection;
            setCurrentSelection(selection);
            setSelectionHandler();
        }
    };

    const characterIndexToWordIndex = (text: string, charIndex: number): number => {
        const textUpToIndex = text.slice(0, charIndex);
        const endsWithSpace = textUpToIndex.endsWith(' ');
        const wordCount = textUpToIndex.split(/\s+/).filter(word => word.trim() !== '').length;
        return endsWithSpace ? wordCount : wordCount - 1;
    };

    const initEditor = useCallback(async () => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return
        quill.container.style.fontSize = '16px'
    }, [])

    const getFormattedContent = (text: string) => {
        const formattedContent: Op[] = [];
        let lastIndex = 0;
        
        // Update pattern to explicitly include the timestamp+blank pattern
        const pattern = /(\d:\d{2}:\d{2}\.\d\s+S\d+:|(?:\[\d:\d{2}:\d{2}\.\d\]\s+____)|\[[^\]]+\])/g;
        let match;
        
        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                formattedContent.push({ insert: text.slice(lastIndex, match.index) });
            }
    
            const matchedText = match[0];
            
            // Rule 1: TS + Speaker labels
            if (matchedText.match(/^\d:\d{2}:\d{2}\.\d\s+S\d+:/)) {
                formattedContent.push({ 
                    insert: matchedText,
                    attributes: { bold: true }
                });
            }
            // Rule 2: TS + blank (complete pattern)
            else if (matchedText.match(/\[\d:\d{2}:\d{2}\.\d\]\s+____/)) {
                formattedContent.push({ 
                    insert: matchedText,
                    attributes: { color: '#FF0000' }
                });
            }
            // Rule 3: Any other bracketed content
            else if (matchedText.startsWith('[')) {
                formattedContent.push({ 
                    insert: matchedText,
                    attributes: { background: '#f5f5f5', color: '#4A4A4A' }
                });
            }
            
            lastIndex = match.index + matchedText.length;
        }
    
        if (lastIndex < text.length) {
            formattedContent.push({ insert: text.slice(lastIndex) });
        }

        return formattedContent;
    };

    const { content: initialContent } = useMemo(() => {
        const storedTranscript = getTranscriptFromStorage(orderDetails.fileId);
        return { content: getFormattedContent(storedTranscript) };
    }, [orderDetails.fileId])

    const handleEditorClick = useCallback(() => {
        const quill = quillRef.current?.getEditor()
        if (!quill) return

        const clickPosition = quill.getSelection()?.index
        if (clickPosition === undefined) return

        const text = quill.getText()
        const wordIndex = characterIndexToWordIndex(text, clickPosition)
        if (wordIndex >= 0 && wordIndex < alignments.length && audioPlayer) {
            const { startPos, word, start } = alignments[wordIndex];
            quill.setSelection(startPos!, word.length);

            console.log('Playing word:', word, 'at timestamp:', start)
            audioPlayer.currentTime = start
            audioPlayer.play()
        }
    }, [alignments, audioPlayer])

    const handlePlayAudioAtCursorPositionShortcut = useCallback(() => {
        handleEditorClick()
    }, [handleEditorClick]);

    const insertTimestampBlankAtCursorPositionInstance = useCallback(() => {
        insertTimestampBlankAtCursorPosition(audioPlayer, quillRef.current?.getEditor());
    }, [audioPlayer]);

    const googleSearchSelectedWord = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill || !quill.getSelection()) return;
    
        let searchText;
        const selection = quill.getSelection();
        if(!selection) return
        
        if (selection.length > 0) {
            searchText = quill.getText(selection.index, selection.length);
        } else {
            const wordIndex = characterIndexToWordIndex(quill.getText(), selection.index);
            if (wordIndex >= 0 && wordIndex < alignments.length) {
                const { startPos, word } = alignments[wordIndex];
                quill.setSelection(startPos!, word.length);
                searchText = word;
            }
        }
    
        if (searchText) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(searchText)}`, '_blank');
        }
    }, [quillRef, alignments]);

    const defineSelectedWord = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill || !quill.getSelection()) return;
     
        let searchText;
        const selection = quill.getSelection();
        if(!selection) return
        
        if (selection.length > 0) {
            searchText = quill.getText(selection.index, selection.length);
        } else {
            const wordIndex = characterIndexToWordIndex(quill.getText(), selection.index);
            if (wordIndex >= 0 && wordIndex < alignments.length) {
                const { startPos, word } = alignments[wordIndex];
                quill.setSelection(startPos!, word.length);
                searchText = word;
            }
        }
     
        if (searchText) {
            window.open(`https://www.google.com/search?q=define: ${encodeURIComponent(searchText)}`, '_blank');
        }
     }, [quillRef, alignments]);

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
        quill.deleteText(selection.index, selection.length, 'user');
        quill.insertText(selection.index, capitalizedWords.join(' '), 'user');
    }, [quillRef]);

    const uppercaseWord = useCallback(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();
        if (!selection) return;

        const text = quill.getText(selection.index, selection.length);
        quill.deleteText(selection.index, selection.length, 'user');
        quill.insertText(selection.index, text.toUpperCase(), 'user');
    }, [quillRef]);

    const lowercaseWord = useCallback(() => {
        if (!quillRef.current) return;
        const quill = quillRef.current.getEditor();
        const selection = quill.getSelection();
        if (!selection) return;

        const text = quill.getText(selection.index, selection.length);
        quill.deleteText(selection.index, selection.length, 'user');
        quill.insertText(selection.index, text.toLowerCase(), 'user');
    }, [quillRef]);

    const joinWithNextParagraph = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        const selection = quill?.getSelection();
        if (!quill || !selection) return;
        
        const text = quill.getText();
        const position = selection.index;
        
        // Add \s* after S\d+: to include the space in timestamp pattern
        const nextParaPattern = /\n\s*(\d:\d{2}:\d{2}\.\d\s+S\d+:\s+)?(\S.*)/;
        nextParaPattern.lastIndex = position;
        const match = nextParaPattern.exec(text.slice(position));
        
        if (!match) return;
        
        const prevParaEnd = position + match.index;
        let paraStart = prevParaEnd;
        while (paraStart > 0 && /\s/.test(text[paraStart - 1])) {
            paraStart--;
        }
        
        const tsLength = match[1]?.length || 0;
        
        quill.deleteText(paraStart, prevParaEnd - paraStart + 1 + tsLength, 'user');
        if (tsLength === 0) quill.insertText(paraStart, ' ', 'user');
        quill.setSelection(paraStart + 1, 0);
     }, [quillRef]);

     const clearLastHighlight = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill || lastHighlightedRef.current === null) {
            return;
        }
     
        const oldAl = alignments[lastHighlightedRef.current];
        if (oldAl.startPos !== undefined && oldAl.endPos !== undefined) {
            quill.formatText(oldAl.startPos, oldAl.endPos - oldAl.startPos, {
                background: null,
            });
        }
        lastHighlightedRef.current = null;
     }, [alignments]);     

    const shortcutControls = useMemo(() => {
        const controls: Partial<ShortcutControls> = {
            playAudioAtCursorPosition: handlePlayAudioAtCursorPositionShortcut,
            insertTimestampBlankAtCursorPosition: insertTimestampBlankAtCursorPositionInstance,
            insertTimestampAndSpeaker: insertTimestampAndSpeaker.bind(null, audioPlayer, quillRef.current?.getEditor()),
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
        insertTimestampAndSpeaker,
        capitalizeFirstLetter,
        uppercaseWord,
        lowercaseWord,
        joinWithNextParagraph
    ]);

    useShortcuts(shortcutControls);

    const clearHighlights = useCallback(() => {
        requestAnimationFrame(() => {
            const quill = quillRef.current?.getEditor();
            if (!quill) return;
            quill.formatText(0, quill.getLength(), { background: null });
        });
    }, []);
        
    const scheduleAlignmentUpdate = useCallback(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
        
        if (typingTimer) clearTimeout(typingTimer);
        setTypingTimer(
            setTimeout(() => {
                const text = quill.getText();
                persistEditorData(orderDetails.fileId, text, '');
                setAlignmentWorkerRunning(true);
                alignmentWorker.current?.postMessage({
                    newText: text,
                    currentAlignments: alignments,
                    ctms: ctms
                });
            }, TYPING_PAUSE)
        );
    }, [alignments, ctms, typingTimer, quillRef, orderDetails.fileId]);

    useEffect(() => {
        try {
            // Initialize the Web Worker
            alignmentWorker.current = new Worker(
                new URL('@/utils/transcript/alignmentWorker.ts', import.meta.url)
            );
      
            alignmentWorker.current.onmessage = (e) => {
                const { alignments: newAlignments, wer, editedSegments } = e.data;
                setAlignments(newAlignments);
                setEditedSegments(new Set(editedSegments));
                setIsTyping(false);
                setAlignmentWorkerRunning(false);
                console.log('Updated alignments:', newAlignments, 'WER:', wer);
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
        const quill = quillRef.current?.getEditor();
        if (!quill || !alignmentWorker.current) return;
     
        const handleTextChange = (delta: Delta, oldDelta: Delta, source: string) => {
            if (source !== 'user') return;
            setIsTyping(true);

            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            if(lastHighlightedRef.current) {
                const oldAl = alignments[lastHighlightedRef.current];
                const oldStartPos = oldAl.startPos;
                const oldEndPos = oldAl.endPos;
                
                if (oldStartPos !== undefined && oldEndPos !== undefined) {
                    const newStartPos = delta.transformPosition(oldStartPos);
                    const newEndPos = delta.transformPosition(oldEndPos);
                    quill.formatText(newStartPos, newEndPos - newStartPos, { background: null });
                }

                lastHighlightedRef.current = null;
            }

            const newItem: UndoRedoItem = {
                delta: new Delta(delta.ops),
                oldDelta: new Delta(oldDelta.ops),
                beforeSelection: beforeSelectionRef.current,
                afterSelection: quill.getSelection()
            };
     
            setUndoStack(prev => {
                const newStack = [...prev];
                if (newStack.length >= STACK_LIMIT) newStack.shift();
                newStack.push(newItem);
                return newStack;
            });
            setRedoStack([]);
            scheduleAlignmentUpdate();
        };
     
        quill.on('text-change', handleTextChange);
     
        return () => {
            quill.off('text-change', handleTextChange);
            if (typingTimer) clearTimeout(typingTimer);
        };
     }, [alignments, ctms, typingTimer, scheduleAlignmentUpdate]);
     
     useEffect(() => {
        const originalExecCommand = document.execCommand;
        document.execCommand = function(command, ...args) {
            if (command === 'undo' || command === 'redo') {
                return false;
            }
            return originalExecCommand.call(this, command, ...args);
        };
     
        const quill = quillRef.current?.getEditor();
        if (!quill) return;
     
        const editorRoot = quill.root;
        const handleBeforeInput = (e: InputEvent) => {
            if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
                e.preventDefault();
            }
        };
     
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setIsTyping(true);  
                clearLastHighlight(); 
         
                if (undoStack.length === 0) return;
                const item = undoStack[undoStack.length - 1];
                setUndoStack(prev => prev.slice(0, -1));
     
                // Invert based on the old doc state
                const revertDelta = item.delta.invert(item.oldDelta);
                quill.updateContents(revertDelta);
     
                setRedoStack(prev => {
                    const newStack = [...prev];
                    if (newStack.length >= STACK_LIMIT) newStack.shift();
                    newStack.push(item);
                    return newStack;
                });
     
                if (item.beforeSelection) {
                    quill.setSelection(item.beforeSelection.index, item.beforeSelection.length);
                }
     
                scheduleAlignmentUpdate();
            }
     
            // Redo
            if (((e.metaKey || e.ctrlKey) && e.key === 'y') || 
                ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                e.stopImmediatePropagation();
                setIsTyping(true);      
                clearLastHighlight(); 
    
                if (redoStack.length === 0) return;
                const item = redoStack[redoStack.length - 1];
                setRedoStack(prev => prev.slice(0, -1));
     
                // Reapply original delta
                quill.updateContents(item.delta);
     
                setUndoStack(prev => {
                    const newStack = [...prev];
                    if (newStack.length >= STACK_LIMIT) newStack.shift();
                    newStack.push(item);
                    return newStack;
                });
     
                if (item.afterSelection) {
                    quill.setSelection(item.afterSelection.index, item.afterSelection.length);
                }
     
                scheduleAlignmentUpdate();
            }
        };
     
        document.addEventListener('keydown', handleKeyDown, true);
        editorRoot.addEventListener('beforeinput', handleBeforeInput, true);
     
        return () => {
            document.execCommand = originalExecCommand;
            document.removeEventListener('keydown', handleKeyDown, true);
            editorRoot.removeEventListener('beforeinput', handleBeforeInput, true);
        };
    }, [undoStack, redoStack, scheduleAlignmentUpdate]);

    useEffect(() => {
        if (!highlightWordsEnabled) {
            clearHighlights();
            lastHighlightedRef.current = null;
        }
    }, [highlightWordsEnabled, clearHighlights]);

    const timeUpdateHandler = useCallback(debounce(() => {
        const quill = quillRef.current?.getEditor();
        if (!quill || !highlightWordsEnabled || isTyping || !audioPlayer || alignmentWorkerRunning) return;
    
        const currentTime = audioPlayer.currentTime;
        const currentWordIndex = getAlignmentIndexByTime(alignments, currentTime, lastHighlightedRef.current);
        
        if (currentWordIndex === lastHighlightedRef.current) return;
    
        clearLastHighlight();
        
        const newAl = alignments[currentWordIndex];
        if (newAl?.startPos !== undefined && newAl?.endPos !== undefined) {
            quill.formatText(newAl.startPos, newAl.endPos - newAl.startPos, {
                background: 'yellow',
            });
            if (!isTyping) {
                lastHighlightedRef.current = currentWordIndex;
            }
        }
    }, 100), [alignments, highlightWordsEnabled, isTyping, clearLastHighlight]);
    
    useEffect(() => {
        if (!audioPlayer) return;
        audioPlayer.addEventListener('timeupdate', timeUpdateHandler);
        return () => {
            timeUpdateHandler.cancel();
            audioPlayer.removeEventListener('timeupdate', timeUpdateHandler);
        };
    }, [timeUpdateHandler, audioPlayer]);

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

            const storedTranscript = getTranscriptFromStorage(orderDetails.fileId);
            if(storedTranscript) {
                // Process any differences between original and stored transcript
                alignmentWorker.current?.postMessage({
                    newText: storedTranscript,
                    currentAlignments: newAlignments,
                    ctms: ctms
                });
            }
        }
    }, [ctms, orderDetails.fileId])

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

    return (
        <>
            {/* <ContextMenu>
                <ContextMenuTrigger className="w-full h-full" onContextMenu={handleContextMenuOpen}> */}
            <ReactQuill
                ref={quillRef}
                theme='snow'
                modules={quillModules}
                defaultValue={{ ops: initialContent }}
                formats={['size', 'background', 'font', 'color', 'bold', 'italics']}
                className='h-full'
                onChangeSelection={handleSelectionChange}
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
