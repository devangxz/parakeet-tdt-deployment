'use client'

import { Delta, Op } from 'quill/core'
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

import { OrderDetails } from '@/app/editor/[fileId]/page'
import { EditorSettings } from '@/types/editor'
import {
  ShortcutControls,
  useShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  CTMType,
  CustomerQuillSelection,
  insertTimestampAndSpeaker,
  insertTimestampBlankAtCursorPosition,
} from '@/utils/editorUtils'
import {
  createAlignments,
  getFormattedTranscript,
  AlignmentType,
  getAlignmentIndexByTime,
} from '@/utils/transcript'

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
  highlightWordsEnabled: boolean
  setFontSize: (size: number) => void
  setEditedSegments: (segments: Set<number>) => void
  editorSettings: EditorSettings
  isWordPlayback: React.MutableRefObject<boolean>;
}

interface UndoRedoItem {
  delta: Delta
  oldDelta: Delta
  beforeSelection: Range | null
  afterSelection: Range | null
}

interface Range {
  index: number
  length: number
}

type Sources = 'user' | 'api' | 'silent'

export default function Editor({
  transcript,
  ctms: initialCtms,
  audioPlayer,
  getQuillRef,
  orderDetails,
  content,
  setContent,
  setSelectionHandler,
  selection,
  searchHighlight,
  highlightWordsEnabled,
  setFontSize,
  setEditedSegments,
  editorSettings,
  isWordPlayback,
}: EditorProps) {
  const ctms = initialCtms // Make CTMs constant
  const quillRef = useRef<ReactQuill>(null)
  const [alignments, setAlignments] = useState<AlignmentType[]>([])
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
  const alignmentWorker = useRef<Worker | null>(null)
  const prevLineNodeRef = useRef<HTMLElement | null>(null)
  const lastHighlightedRef = useRef<number | null>(null)
  const [undoStack, setUndoStack] = useState<UndoRedoItem[]>([])
  const [redoStack, setRedoStack] = useState<UndoRedoItem[]>([])
  const beforeSelectionRef = useRef<Range | null>(null)
  const [currentSelection, setCurrentSelection] = useState<Range | null>(null)
  const [showCustomContextMenu, setShowCustomContextMenu] = useState<boolean>(
    !editorSettings.useNativeContextMenu
  )
  const [menuPosition, setMenuPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const TYPING_PAUSE = 500 // Half second pause indicates word completion
  const STACK_LIMIT = 100

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

  const getFormattedContent = (text: string) => {
    const formattedContent: Op[] = []
    let lastIndex = 0

    // Update pattern to explicitly include the timestamp+blank pattern
    const pattern =
      /(\d:\d{2}:\d{2}\.\d\s+S\d+:|(?:\[\d:\d{2}:\d{2}\.\d\]\s+____)|\[[^\]]+\])/g
    let match

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        formattedContent.push({ insert: text.slice(lastIndex, match.index) })
      }

      const matchedText = match[0]

      // Rule 1: TS + Speaker labels
      if (matchedText.match(/^\d:\d{2}:\d{2}\.\d\s+S\d+:/)) {
        formattedContent.push({
          insert: matchedText,
          attributes: { bold: true },
        })
      }
      // Rule 2: TS + blank (complete pattern)
      else if (matchedText.match(/\[\d:\d{2}:\d{2}\.\d\]\s+____/)) {
        formattedContent.push({
          insert: matchedText,
          attributes: { color: '#FF0000' },
        })
      }
      // Rule 3: Any other bracketed content
      else if (matchedText.startsWith('[')) {
        formattedContent.push({
          insert: matchedText,
          attributes: { background: '#f5f5f5', color: '#4A4A4A' },
        })
      }

      lastIndex = match.index + matchedText.length
    }

    if (lastIndex < text.length) {
      formattedContent.push({ insert: text.slice(lastIndex) })
    }

    return formattedContent
  }

  useEffect(() => {
    if (!content.length) {
      const formattedContent = getFormattedContent(transcript)
      setContent(formattedContent)
    }
  }, [content.length, transcript])

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
      isWordPlayback.current = true
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

  const handleContentChange = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    setContent(quill.getContents().ops)
  }, [orderDetails.fileId])

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
        alignmentWorker.current?.postMessage({
          newText: quill.getText(),
          currentAlignments: alignments,
          ctms: ctms,
        })
      }, TYPING_PAUSE)
    )
  }, [alignments, ctms, typingTimer, quillRef])

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
      const quill = quillRef.current?.getEditor()
      if (!quill) return

      const newItem: UndoRedoItem = {
        delta: new Delta(delta.ops),
        oldDelta: new Delta(oldDelta.ops),
        beforeSelection: beforeSelectionRef.current,
        afterSelection: quill.getSelection(),
      }

      setUndoStack((prev) => {
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
    const originalExecCommand = document.execCommand
    document.execCommand = function (command, ...args) {
      if (command === 'undo' || command === 'redo') {
        return false
      }
      return originalExecCommand.call(this, command, ...args)
    }

    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const editorRoot = quill.root
    const handleBeforeInput = (e: InputEvent) => {
      if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
        e.preventDefault()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        e.stopImmediatePropagation()

        if (undoStack.length === 0) return
        const item = undoStack[undoStack.length - 1]
        setUndoStack((prev) => prev.slice(0, -1))

        // Invert based on the old doc state
        const revertDelta = item.delta.invert(item.oldDelta)
        quill.updateContents(revertDelta)

        setRedoStack((prev) => {
          const newStack = [...prev]
          if (newStack.length >= STACK_LIMIT) newStack.shift()
          newStack.push(item)
          return newStack
        })

        if (item.beforeSelection) {
          quill.setSelection(
            item.beforeSelection.index,
            item.beforeSelection.length
          )
        }

        scheduleAlignmentUpdate()
      }

      // Redo
      if (
        ((e.metaKey || e.ctrlKey) && e.key === 'y') ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z')
      ) {
        e.preventDefault()
        e.stopImmediatePropagation()

        if (redoStack.length === 0) return
        const item = redoStack[redoStack.length - 1]
        setRedoStack((prev) => prev.slice(0, -1))

        // Reapply original delta
        quill.updateContents(item.delta)

        setUndoStack((prev) => {
          const newStack = [...prev]
          if (newStack.length >= STACK_LIMIT) newStack.shift()
          newStack.push(item)
          return newStack
        })

        if (item.afterSelection) {
          quill.setSelection(
            item.afterSelection.index,
            item.afterSelection.length
          )
        }

        scheduleAlignmentUpdate()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    editorRoot.addEventListener('beforeinput', handleBeforeInput, true)

    return () => {
      document.execCommand = originalExecCommand
      document.removeEventListener('keydown', handleKeyDown, true)
      editorRoot.removeEventListener('beforeinput', handleBeforeInput, true)
    }
  }, [undoStack, redoStack, scheduleAlignmentUpdate])

  useEffect(() => {
    if (!highlightWordsEnabled) {
      clearHighlights()
      lastHighlightedRef.current = null
    }
  }, [highlightWordsEnabled, clearHighlights])

  useEffect(() => {
    if (!audioPlayer) return

    const handleTimeUpdate = () => {
      const quill = quillRef.current?.getEditor()

      if (!quill || !highlightWordsEnabled) return

      const currentTime = audioPlayer.currentTime
      const currentWordIndex = getAlignmentIndexByTime(
        alignments,
        currentTime,
        lastHighlightedRef.current
      )

      // Skip if same word
      if (currentWordIndex === lastHighlightedRef.current) return

      // Un-highlight the old word
      if (lastHighlightedRef.current !== null) {
        const oldAl = alignments[lastHighlightedRef.current]
        if (oldAl.startPos !== undefined && oldAl.endPos !== undefined) {
          quill.formatText(oldAl.startPos, oldAl.endPos - oldAl.startPos, {
            background: null,
          })
        }
      }

      // Highlight the new word
      const newAl = alignments[currentWordIndex]
      if (newAl.startPos !== undefined && newAl.endPos !== undefined) {
        quill.formatText(newAl.startPos, newAl.endPos - newAl.startPos, {
          background: 'yellow',
        })
      }

      lastHighlightedRef.current = currentWordIndex
    }

    audioPlayer.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audioPlayer.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [alignments, audioPlayer, highlightWordsEnabled])

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
  }, [])

  // Create initial alignments once when component loads
  useEffect(() => {
    if (ctms.length > 0) {
      const originalTranscript = getFormattedTranscript(ctms)
      const newAlignments = createAlignments(originalTranscript, ctms)
      setAlignments(newAlignments)

      if (transcript) {
        // Process any differences between original and current transcript
        alignmentWorker.current?.postMessage({
          newText: transcript,
          currentAlignments: newAlignments,
          ctms: ctms,
        })
      }
    }
  }, [])

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
        background: '#D9D9D9',
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
        background: null,
      })
    }

    // Remove search highlight if exists
    if (searchHighlight) {
      quill.formatText(searchHighlight.index, searchHighlight.length, {
        background: null,
      })
    }
  }

  const handleCursorMove = useCallback(() => {
    const quill = quillRef.current?.getEditor()
    if (!quill) return

    const selection = quill.getSelection()
    if (!selection) return

    // If the user is highlighting text, you may want to bail out:
    if (selection.length > 0) return

    const [line] = quill.getLine(selection.index)
    if (!line) return

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

  return (
    <div className='relative w-full h-full'>
      <ReactQuill
        ref={quillRef}
        theme='snow'
        modules={quillModules}
        value={{ ops: content }}
        onChange={handleContentChange}
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
}
