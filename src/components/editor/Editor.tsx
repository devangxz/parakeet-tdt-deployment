'use client'

import debounce from 'lodash/debounce'
import { Delta } from 'quill/core'
import React, { useRef, useEffect, useCallback, useMemo, useState, useImperativeHandle, forwardRef } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { OrderDetails } from '@/app/editor/[fileId]/page'
import { EditorSettings, CTMType, AlignmentType, UndoRedoItem, Range } from '@/types/editor'
import {
  ShortcutControls,
  useShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  CustomerQuillSelection,
  getFormattedContent,
  insertTimestampAndSpeaker,
  insertTimestampBlankAtCursorPosition,
  EditorData
} from '@/utils/editorUtils'
import { persistEditorDataIDB } from '@/utils/indexedDB'
import {
  createAlignments,
  getFormattedTranscript,
  getAlignmentIndexByTime,
} from '@/utils/transcript'

const TYPING_PAUSE = 500; // Half second pause indicates word completion
const STACK_LIMIT = 100;

interface EditorProps {
  ctms: CTMType[]
  audioPlayer: HTMLAudioElement | null
  duration: number
  getQuillRef: (quillRef: React.RefObject<ReactQuill>) => void
  orderDetails: OrderDetails
  setSelectionHandler: () => void
  selection: CustomerQuillSelection | null
  searchHighlight: CustomerQuillSelection | null
  highlightWordsEnabled: boolean
  setEditedSegments: (segments: Set<number>) => void
  editorSettings: EditorSettings
  setFontSize: (size: number) => void
  initialEditorData: EditorData; 
}

type Sources = 'user' | 'api' | 'silent'

// Export an interface for the methods exposed by Editor
export interface EditorHandle {
  triggerAlignmentUpdate: () => void;
  clearAllHighlights: () => void;
  scrollToCurrentWord: () => void;
}

// Wrap the component in forwardRef so the parent can call exposed methods
const Editor = forwardRef<EditorHandle, EditorProps>((props, ref) => {
  const {
    ctms: initialCtms,
    audioPlayer,
    getQuillRef,
    orderDetails,
    setSelectionHandler,
    selection,
    searchHighlight,
    highlightWordsEnabled,
    setEditedSegments,
    editorSettings,
    setFontSize,
    initialEditorData
  } = props

  const ctms = initialCtms // Make CTMs constant
  const quillRef = useRef<ReactQuill>(null)
  const [alignments, setAlignments] = useState<AlignmentType[]>([])
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
  const alignmentWorker = useRef<Worker | null>(null)
  const prevLineNodeRef = useRef<HTMLElement | null>(null)
  const lastHighlightedRef = useRef<number | null>(null)
  const beforeSelectionRef = useRef<Range | null>(null)
  const [currentSelection, setCurrentSelection] = useState<Range | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [alignmentWorkerRunning, setAlignmentWorkerRunning] = useState(false)
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [showCustomContextMenu, setShowCustomContextMenu] = useState<boolean>(
    !editorSettings.useNativeContextMenu
  )
  const [menuPosition, setMenuPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const quillModules = {
    history: false,
    toolbar: false,
  }

  // Selection change handler
  const handleSelectionChange = (selection: Range | null, source: Sources) => {
    if (source === 'user') {
      beforeSelectionRef.current = currentSelection
      setCurrentSelection(selection)
      setSelectionHandler()
    }
  }

  const characterIndexToWordIndex = (
    text: string,
    charIndex: number
  ): number => {
    const textUpToIndex = text.slice(0, charIndex)
    const endsWithSpace = textUpToIndex.endsWith(' ')
    const wordCount = textUpToIndex
      .split(/\s+/)
      .filter((word) => word.trim() !== '').length
    return endsWithSpace ? wordCount : wordCount - 1
  }

  const initEditor = useCallback(async () => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    quill.container.style.fontSize = '16px'
  }, [])

  // Initialize editor state from the initialEditorData prop
  const { 
    content: initialContent, 
    undoStack: initialUndoStack, 
    redoStack: initialRedoStack 
  } = useMemo(() => {
    const editorData = initialEditorData || { transcript: '', undoStack: [], redoStack: [] };
    const transcript = editorData.transcript || '';
    // Reconstruct the undo/redo stacks if needed
    const reconstructStack = (stack: UndoRedoItem[] = []): UndoRedoItem[] =>
      stack.map(item => ({
        ...item,
        delta: new Delta(item.delta.ops),
        oldDelta: new Delta(item.oldDelta.ops),
      }));
    return { 
      content: getFormattedContent(transcript),
      undoStack: reconstructStack(editorData.undoStack),
      redoStack: reconstructStack(editorData.redoStack),
    };
  }, [initialEditorData]);

  const [undoStack, setUndoStack] = useState<UndoRedoItem[]>(initialUndoStack);
  const [redoStack, setRedoStack] = useState<UndoRedoItem[]>(initialRedoStack);

  const handleEditorClick = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const clickPosition = quill.getSelection()?.index
    if (clickPosition === undefined) return

    const text = quill.getText()
    const wordIndex = characterIndexToWordIndex(text, clickPosition)
    if (wordIndex >= 0 && wordIndex < alignments.length && audioPlayer) {
      const { startPos, word, start } = alignments[wordIndex]
      quill.setSelection(startPos!, word.length)

      console.log('Playing word:', word, 'at timestamp:', start)
      audioPlayer.currentTime = start
      audioPlayer.play()
    }
  }, [alignments, audioPlayer])

  const handlePlayAudioAtCursorPositionShortcut = useCallback(() => {
    handleEditorClick()
  }, [handleEditorClick])

  const insertTimestampBlankAtCursorPositionInstance = useCallback(() => {
    insertTimestampBlankAtCursorPosition(
      audioPlayer,
      quillRef.current?.getEditor()
    )
  }, [audioPlayer])

  const googleSearchSelectedWord = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !quill.getSelection()) return

    let searchText
    const selection = quill.getSelection()
    if (!selection) return

    if (selection.length > 0) {
      searchText = quill.getText(selection.index, selection.length)
    } else {
      const wordIndex = characterIndexToWordIndex(
        quill.getText(),
        selection.index
      )
      if (wordIndex >= 0 && wordIndex < alignments.length) {
        const { startPos, word } = alignments[wordIndex]
        quill.setSelection(startPos!, word.length)
        searchText = word
      }
    }

    if (searchText) {
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
        '_blank'
      )
    }
  }, [quillRef, alignments])

  const defineSelectedWord = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !quill.getSelection()) return

    let searchText
    const selection = quill.getSelection()
    if (!selection) return

    if (selection.length > 0) {
      searchText = quill.getText(selection.index, selection.length)
    } else {
      const wordIndex = characterIndexToWordIndex(
        quill.getText(),
        selection.index
      )
      if (wordIndex >= 0 && wordIndex < alignments.length) {
        const { startPos, word } = alignments[wordIndex]
        quill.setSelection(startPos!, word.length)
        searchText = word
      }
    }

    if (searchText) {
      window.open(
        `https://www.google.com/search?q=define: ${encodeURIComponent(
          searchText
        )}`,
        '_blank'
      )
    }
  }, [quillRef, alignments])

  const adjustFontSize = useCallback(
    (increase: boolean) => {
      if (!quillRef?.current) return
      const quill = quillRef.current.getEditor()
      const container = quill.container as HTMLElement
      const currentSize = parseInt(window.getComputedStyle(container).fontSize)
      const newSize = increase ? currentSize + 1 : currentSize - 1
      const clampedSize = Math.min(Math.max(newSize, 1), 400)
      container.style.fontSize = `${clampedSize}px`
      setFontSize(clampedSize)
    },
    [quillRef]
  )

  const capitalizeFirstLetter = useCallback(() => {
    if (!quillRef.current) return
    const quill = quillRef.current.getEditor()
    const selection = quill.getSelection()
    if (!selection) return

    const text = quill.getText(selection.index, selection.length)
    const words = text.split(' ')
    const capitalizedWords = words.map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    quill.deleteText(selection.index, selection.length, 'user')
    quill.insertText(selection.index, capitalizedWords.join(' '), 'user')
  }, [quillRef])

  const uppercaseWord = useCallback(() => {
    if (!quillRef.current) return
    const quill = quillRef.current.getEditor()
    const selection = quill.getSelection()
    if (!selection) return

    const text = quill.getText(selection.index, selection.length)
    quill.deleteText(selection.index, selection.length, 'user')
    quill.insertText(selection.index, text.toUpperCase(), 'user')
  }, [quillRef])

  const lowercaseWord = useCallback(() => {
    if (!quillRef.current) return
    const quill = quillRef.current.getEditor()
    const selection = quill.getSelection()
    if (!selection) return

    const text = quill.getText(selection.index, selection.length)
    quill.deleteText(selection.index, selection.length, 'user')
    quill.insertText(selection.index, text.toLowerCase(), 'user')
  }, [quillRef])

  const joinWithNextParagraph = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    const selection = quill?.getSelection()
    if (!quill || !selection) return

    const text = quill.getText()
    const position = selection.index

    // Add \s* after S\d+: to include the space in timestamp pattern
    const nextParaPattern = /\n\s*(\d:\d{2}:\d{2}\.\d\s+S\d+:\s+)?(\S.*)/
    nextParaPattern.lastIndex = position
    const match = nextParaPattern.exec(text.slice(position))

    if (!match) return

    const prevParaEnd = position + match.index
    let paraStart = prevParaEnd
    while (paraStart > 0 && /\s/.test(text[paraStart - 1])) {
      paraStart--
    }

    const tsLength = match[1]?.length || 0

    quill.deleteText(paraStart, prevParaEnd - paraStart + 1 + tsLength, 'user')
    if (tsLength === 0) quill.insertText(paraStart, ' ', 'user')
    quill.setSelection(paraStart + 1, 0)
  }, [quillRef])

  const clearLastHighlight = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill || lastHighlightedRef.current === null) {
      return
    }

    const oldAl = alignments[lastHighlightedRef.current]
    if (oldAl.startPos !== undefined && oldAl.endPos !== undefined) {
      quill.formatText(oldAl.startPos, oldAl.endPos - oldAl.startPos, {
        background: null,
      })
    }
    lastHighlightedRef.current = null
  }, [alignments])

  const shortcutControls = useMemo(() => {
    const controls: Partial<ShortcutControls> = {
      playAudioAtCursorPosition: handlePlayAudioAtCursorPositionShortcut,
      insertTimestampBlankAtCursorPosition:
        insertTimestampBlankAtCursorPositionInstance,
      insertTimestampAndSpeaker: insertTimestampAndSpeaker.bind(
        null,
        audioPlayer,
        quillRef.current?.getEditor()
      ),
      googleSearchSelectedWord,
      defineSelectedWord,
      capitalizeFirstLetter,
      joinWithNextParagraph,
      uppercaseWord,
      lowercaseWord,
      increaseFontSize: () => adjustFontSize(true),
      decreaseFontSize: () => adjustFontSize(false),
    }
    return controls as ShortcutControls
  }, [
    handlePlayAudioAtCursorPositionShortcut,
    insertTimestampBlankAtCursorPosition,
    insertTimestampAndSpeaker,
    capitalizeFirstLetter,
    uppercaseWord,
    lowercaseWord,
    joinWithNextParagraph,
  ])

  useShortcuts(shortcutControls)

  const clearHighlights = useCallback(() => {
    requestAnimationFrame(() => {
      const quill = quillRef.current?.getEditor()
      if (!quill) return
      quill.formatText(0, quill.getLength(), { background: null })
    })
  }, [])

  const scheduleAlignmentUpdate = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
  
    if (typingTimer) clearTimeout(typingTimer)
    setTypingTimer(
      setTimeout(() => {
        const transcript = quill.getText()
        persistEditorDataIDB(orderDetails.fileId, { transcript })
        setAlignmentWorkerRunning(true)
        alignmentWorker.current?.postMessage({
          newText: transcript,
          currentAlignments: alignments,
          ctms: ctms,
        })
      }, TYPING_PAUSE)
    )
  }, [alignments, ctms, typingTimer, quillRef, orderDetails.fileId])

  // Create a function to update alignment immediately without debounce
  const updateAlignments = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return
    if (typingTimer) clearTimeout(typingTimer)
    const transcript = quill.getText()
    persistEditorDataIDB(orderDetails.fileId, { transcript })
    setAlignmentWorkerRunning(true)
    alignmentWorker.current?.postMessage({
      newText: transcript,
      currentAlignments: alignments,
      ctms: ctms,
    })
  }, [alignments, ctms, typingTimer, quillRef, orderDetails.fileId])

  // Create a function to clear any word and line highlights
  const clearAllHighlights = useCallback(() => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    // Clear background highlights on all text
    quill.formatText(0, quill.getLength(), { background: null });
    // Remove any custom "line-highlight" classes from the editor
    const editorRoot = quill.root;
    editorRoot.querySelectorAll('.line-highlight').forEach((el) => {
      (el as HTMLElement).classList.remove('line-highlight');
    });
    // Reset any stored last highlight
    lastHighlightedRef.current = null;
  }, [quillRef]);

  useEffect(() => {
    try {
      // Initialize the Web Worker
      alignmentWorker.current = new Worker(
        new URL('@/utils/transcript/alignmentWorker.ts', import.meta.url)
      )

      alignmentWorker.current.onmessage = (e) => {
        const { alignments: newAlignments, wer, editedSegments } = e.data
        setAlignments(newAlignments)
        setEditedSegments(new Set(editedSegments))
        setIsTyping(false)
        setAlignmentWorkerRunning(false)
        console.log('Updated alignments:', newAlignments, 'WER:', wer)
      }

      console.log('Web Worker initialized successfully.')
    } catch (error) {
      console.error('Failed to initialize Web Worker:', error)
    }

    return () => {
      if (alignmentWorker.current) {
        alignmentWorker.current.terminate()
        console.log('Web Worker terminated.')
      }
    }
  }, [])

  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !alignmentWorker.current) return

    const handleTextChange = (
      delta: Delta,
      oldDelta: Delta,
      source: string
    ) => {
      if (source !== 'user') return
      setIsTyping(true)

      const quill = quillRef.current?.getEditor()
      if (!quill) return

      if (lastHighlightedRef.current) {
        const oldAl = alignments[lastHighlightedRef.current]
        const oldStartPos = oldAl.startPos
        const oldEndPos = oldAl.endPos

        if (oldStartPos !== undefined && oldEndPos !== undefined) {
          const newStartPos = delta.transformPosition(oldStartPos)
          const newEndPos = delta.transformPosition(oldEndPos)
          quill.formatText(newStartPos, newEndPos - newStartPos, {
            background: null,
          })
        }

        lastHighlightedRef.current = null
      }

      const newItem: UndoRedoItem = {
        delta: new Delta(delta.ops),
        oldDelta: new Delta(oldDelta.ops),
        beforeSelection: beforeSelectionRef.current,
        afterSelection: quill.getSelection()
      }

      setUndoStack(prev => {
        const newStack = [...prev]
        if (newStack.length >= STACK_LIMIT) newStack.shift()
        newStack.push(newItem)
        return newStack
      })
      setRedoStack([])
      scheduleAlignmentUpdate()
    }

    quill.on('text-change', handleTextChange)

    return () => {
      quill.off('text-change', handleTextChange)
      if (typingTimer) clearTimeout(typingTimer)
    }
  }, [alignments, ctms, typingTimer, scheduleAlignmentUpdate])
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
      if (isEditorFocused && (e.inputType === 'historyUndo' || e.inputType === 'historyRedo')) {
        e.preventDefault();
      }
    };
 
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditorFocused) return;

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

      // If the Enter key is pressed, clear any line highlight
      if (e.key === 'Enter') {
        if (prevLineNodeRef.current) {
          prevLineNodeRef.current.classList.remove("line-highlight");
          prevLineNodeRef.current = null;
        }
      }

      if (quill) {
        beforeSelectionRef.current = quill.getSelection();
      }
    };
 
    document.addEventListener('keydown', handleKeyDown, true);
    editorRoot.addEventListener('beforeinput', handleBeforeInput, true);
 
    return () => {
      document.execCommand = originalExecCommand;
      document.removeEventListener('keydown', handleKeyDown, true);
      editorRoot.removeEventListener('beforeinput', handleBeforeInput, true);
    };
  }, [undoStack, redoStack, scheduleAlignmentUpdate, clearLastHighlight, isEditorFocused]);

  useEffect(() => {
    if (!highlightWordsEnabled) {
      clearHighlights()
      lastHighlightedRef.current = null
    }
  }, [highlightWordsEnabled, clearHighlights])

  const timeUpdateHandler = useCallback(
    debounce(() => {
      const quill = quillRef.current?.getEditor();
      if (
        !quill ||
        !highlightWordsEnabled ||
        isTyping ||
        !audioPlayer ||
        alignmentWorkerRunning
      )
        return;

      const currentTime = audioPlayer.currentTime;
      const currentWordIndex = getAlignmentIndexByTime(
        alignments,
        currentTime,
        lastHighlightedRef.current
      );

      if (currentWordIndex === lastHighlightedRef.current) return;

      clearLastHighlight();

      const newAl = alignments[currentWordIndex];
      if (newAl?.startPos !== undefined && newAl?.endPos !== undefined) {
        // Highlight the new word
        quill.formatText(newAl.startPos, newAl.endPos - newAl.startPos, {
          background: 'yellow',
        });

        if (!isTyping) {
          lastHighlightedRef.current = currentWordIndex;
        }
      }
    }, 100),
    [alignments, highlightWordsEnabled, isTyping, clearLastHighlight]
  );

  useEffect(() => {
    if (!audioPlayer) return;
    audioPlayer.addEventListener('timeupdate', timeUpdateHandler);
    return () => {
      timeUpdateHandler.cancel();
      audioPlayer.removeEventListener('timeupdate', timeUpdateHandler);
    }
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
        setIsEditorFocused(true)
      }, 0)        
    }
  }, []);    

  // Create initial alignments once when component loads
  useEffect(() => {
    if (!ctms.length) return;

    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // Create initial alignments from transcript
    const originalTranscript = getFormattedTranscript(ctms);
    const newAlignments = createAlignments(originalTranscript, ctms);
    setAlignments(newAlignments);

    // Process current text differences if any exist
    const currentText = quill.getText();
    if (!currentText) return;

    alignmentWorker.current?.postMessage({
      newText: currentText,
      currentAlignments: newAlignments,
      ctms
    });
  }, [ctms])

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

  useEffect(() => {
      // Persist the undoStack and redoStack using persistEditorData
      persistEditorDataIDB(orderDetails.fileId, { undoStack, redoStack });
  }, [undoStack, redoStack, orderDetails.fileId]);

  const handleContextMenuSelect = useCallback(
    (action: string) => {
      if (!quillRef.current) return
      const quill = quillRef.current.getEditor()
      const selection = quill.getSelection()

      if (!selection) return

      switch (action) {
        case 'google':
          googleSearchSelectedWord()
          break
        case 'define':
          defineSelectedWord()
          break
        case 'play-word':
          handleEditorClick()
          break
      }
    },
    [googleSearchSelectedWord, defineSelectedWord, handleEditorClick]
  )

  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const handleQuillContextMenu = (e: MouseEvent) => {
      if (!quillRef.current) return

      const quill = quillRef.current.getEditor()
      const textPosition = quill.getSelection(true)
      if (!textPosition) return

      const text = quill.getText()
      let wordStart = textPosition.index
      let wordEnd = textPosition.index

      while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
        wordStart--
      }
      while (wordEnd < text.length && !/\s/.test(text[wordEnd])) {
        wordEnd++
      }

      quill.setSelection(wordStart, wordEnd - wordStart)

      const shouldShowCustomMenu = editorSettings.useNativeContextMenu
        ? e.altKey
        : !e.altKey

      if (shouldShowCustomMenu) {
        e.preventDefault()
        e.stopPropagation()
        setMenuPosition({ x: e.pageX, y: e.pageY })
        setShowCustomContextMenu(true)
      } else {
        setShowCustomContextMenu(false)
        setMenuPosition(null)
      }
    }

    quill.root.addEventListener('contextmenu', handleQuillContextMenu)

    return () => {
      quill.root.removeEventListener('contextmenu', handleQuillContextMenu)
    }
  }, [editorSettings.useNativeContextMenu])

  useEffect(() => {
    const handleClickOutside = () => {
      if (showCustomContextMenu) {
        setShowCustomContextMenu(false)
        setMenuPosition(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showCustomContextMenu])
  
  useEffect(() => {
    const editor = quillRef.current?.getEditor()?.root
    if (!editor) return

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      const quill = quillRef.current?.getEditor()
      if (!quill) return

      const selection = quill.getSelection()
      if (!selection) return

      // Get only the selected text
      const selectedText = quill.getText(selection.index, selection.length)
      // Clean up multiple line breaks
      const cleanText = selectedText.replace(/\n{2,}/g, '\n\n')
      e.clipboardData?.setData('text/plain', cleanText)
    }

    editor.addEventListener('copy', handleCopy)

    return () => {
      editor.removeEventListener('copy', handleCopy)
    }
  }, [])

  const handleBlur = () => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !selection) return

    // Only apply highlight to selected text
    if (selection.length > 0) {
      quill.formatText(selection.index, selection.length, {
        background: '#D9D9D9'
      })
    }

    setIsEditorFocused(false);
  }

  // Update handleFocus to preserve line highlight
  const handleFocus = () => {
    const quill = quillRef.current?.getEditor()
    if (!quill || !selection) return

    // Only remove highlight from selected text
    if (selection.length > 0) {
      quill.formatText(selection.index, selection.length, {
        background: null,
      })
    }

    // Remove search highlight if exists
    if (searchHighlight) {
      quill.formatText(searchHighlight.index, searchHighlight.length, {
        background: null
      })
    }

    setIsEditorFocused(true)
  }

  const handleCursorMove = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const selection = quill.getSelection()
    if (!selection) return

    // If the user is highlighting text, you may want to bail out:
    if (selection.length > 0) return

    const [line] = quill.getLine(selection.index);
    if (!line) return;

    // Get the text content of the line
    const lineText = line.domNode.textContent;
    if (!lineText?.trim()) return; // Skip empty lines

    // If still in the same line as before, skip
    const currentLineDomNode = line.domNode as HTMLElement
    if (prevLineNodeRef.current === currentLineDomNode) return

    // Remove highlight from old line
    if (prevLineNodeRef.current) {
      prevLineNodeRef.current.classList.remove('line-highlight')
    }

    // Add highlight to the new line
    currentLineDomNode.classList.add('line-highlight')
    prevLineNodeRef.current = currentLineDomNode
  }, [])

  useEffect(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    quill.on('selection-change', handleCursorMove)
    return () => {
      quill.off('selection-change', handleCursorMove)
    }
  }, [handleCursorMove])

  // Expose the immediate alignment update & clear highlights function via ref
  useImperativeHandle(ref, () => ({
    triggerAlignmentUpdate: updateAlignments,
    clearAllHighlights: clearAllHighlights,
    scrollToCurrentWord: () => {
      const quill = quillRef.current?.getEditor();
      if (!quill || !audioPlayer) return;
      const currentTime = audioPlayer.currentTime;
      const currentWordIndex = getAlignmentIndexByTime(
        alignments,
        currentTime,
        lastHighlightedRef.current
      );
      if (currentWordIndex === null || currentWordIndex === undefined) return;
      const newAl = alignments[currentWordIndex];
      if (newAl?.startPos !== undefined && newAl?.endPos !== undefined) {
        // Scroll the highlighted word into view
        const bounds = quill.getBounds(newAl.startPos, newAl.endPos - newAl.startPos);
        if (!bounds) return;
        const editorEl = quill.root;
        const targetScrollTop = bounds.top + editorEl.scrollTop - editorEl.clientHeight / 2;
        editorEl.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }
  }))

  return (
    <div className='relative w-full h-full'>
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

      {showCustomContextMenu && menuPosition && (
        <div
          className='fixed z-50 max-w-fit flex flex-col bg-white shadow-lg rounded-md border border-gray-200'
          style={{
            left: menuPosition.x,
            top: menuPosition.y,
          }}
        >
          <button
            className='px-4 py-2 text-left hover:bg-secondary'
            onClick={() => {
              handleContextMenuSelect('play-word')
              setShowCustomContextMenu(false)
              setMenuPosition(null)
            }}
          >
            Play Word
          </button>
          <button
            className='px-4 py-2 text-left hover:bg-secondary'
            onClick={() => {
              handleContextMenuSelect('google')
              setShowCustomContextMenu(false)
              setMenuPosition(null)
            }}
          >
            Google Search
          </button>
          <button
            className='px-4 py-2 text-left hover:bg-secondary'
            onClick={() => {
              handleContextMenuSelect('define')
              setShowCustomContextMenu(false)
              setMenuPosition(null)
            }}
          >
            Define Word
          </button>
        </div>
      )}
    </div>
  )
})

Editor.displayName = 'Editor'
export default Editor
