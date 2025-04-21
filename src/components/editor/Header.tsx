'use client'

import {
  ReloadIcon,
  PlayIcon,
  PauseIcon,
  DoubleArrowUpIcon,
  DoubleArrowDownIcon,
  SpeakerQuietIcon,
  SpeakerLoudIcon,
  TrackPreviousIcon,
  TrackNextIcon,
} from '@radix-ui/react-icons'
import Quill from 'quill'
import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import PlayerButton from './PlayerButton'
import Toolbar from './Toolbar'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { EditorHandle } from '@/components/editor/Editor'
import { OrderDetails } from '@/components/editor/EditorPage'
import Waveform from '@/components/editor/Waveform'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import 'rc-slider/assets/index.css'
import { EditorSettings } from '@/types/editor'
import {
  ShortcutControls,
  useShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  adjustTimestamps,
  insertTimestampBlankAtCursorPosition,
  navigateAndPlayBlanks,
  playCurrentParagraphTimestamp,
} from '@/utils/editorUtils'

const createShortcutControls = (
  audioPlayer: React.RefObject<HTMLAudioElement>,
  quill: Quill | null,
  setSpeed: React.Dispatch<React.SetStateAction<number>>,
  setVolumePercentage: React.Dispatch<React.SetStateAction<number>>,
  editorSettings: EditorSettings
): ShortcutControls => ({
  togglePlay: () => {
    if (!audioPlayer.current) return
    if (audioPlayer.current.paused) {
      if (editorSettings.audioRewindSeconds > 0) {
        audioPlayer.current.currentTime = Math.max(
          0,
          audioPlayer.current.currentTime - editorSettings.audioRewindSeconds
        )
      }
      audioPlayer.current.play()
    } else {
      audioPlayer.current.pause()
    }
  },
  pause: () => {
    audioPlayer.current?.pause()
  },
  skipAudio: (seconds: number) => {
    if (audioPlayer.current) {
      audioPlayer.current.currentTime += seconds
      if (audioPlayer.current.paused) {
        audioPlayer.current.play()
      }
    }
  },
  playNextBlank: () => {},
  playPreviousBlank: () => {},
  playAudioAtCursorPosition: () => {},
  insertTimestampBlankAtCursorPosition: () => {},
  insertTimestampAndSpeaker: () => {},
  googleSearchSelectedWord: () => {},
  defineSelectedWord: () => {},
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  repeatLastFind: () => {},
  increaseVolume: () => {
    setVolumePercentage((prevVol: number) => Math.min(500, prevVol + 10))
  },
  decreaseVolume: () => {
    setVolumePercentage((prevVol: number) => Math.max(0, prevVol - 10))
  },
  increasePlaybackSpeed: () => {
    setSpeed((prevSpeed: number) => Math.min(300, prevSpeed + 10))
  },
  decreasePlaybackSpeed: () => {
    setSpeed((prevSpeed: number) => Math.max(10, prevSpeed - 10))
  },
  playAudioFromTheStartOfCurrentParagraph: () => {},
  capitalizeFirstLetter: () => {},
  uppercaseWord: () => {},
  lowercaseWord: () => {},
  joinWithNextParagraph: () => {},
  findNextOccurrenceOfString: () => {},
  findThePreviousOccurrenceOfString: () => {},
  replaceNextOccurrenceOfString: () => {},
  replaceAllOccurrencesOfString: () => {},
  saveChanges: () => {},
  jumpAudioAndCursorForwardBy3Seconds: () => {
    if (audioPlayer.current) audioPlayer.current.currentTime += 3
  },
  playNextBlankInstance: () => {
    if (!quill || !audioPlayer.current) return
    navigateAndPlayBlanks(quill, audioPlayer.current)
  },
  playPreviousBlankInstance: () => {
    if (!quill || !audioPlayer.current) return
    navigateAndPlayBlanks(quill, audioPlayer.current, true)
  },
  playCurrentParagraphInstance: () => {
    if (!quill || !audioPlayer.current) return
    playCurrentParagraphTimestamp(quill, audioPlayer.current)
  },
  adjustTimestampsInstance: () => {
    if (!quill) return
    // You'll need to pass the appropriate parameters for adjustTimestamps
    adjustTimestamps(quill, 0, quill.getSelection())
  },
  playAt75Speed: () => {
    setSpeed(75)
  },
  playAt100Speed: () => {
    setSpeed(100)
  },
})

interface HeaderProps {
  getAudioPlayer?: (audioPlayer: HTMLAudioElement | null) => void
  quillRef: React.RefObject<ReactQuill> | undefined
  orderDetails: OrderDetails
  toggleFindAndReplace: () => void
  waveformUrl: string
  highlightWordsEnabled: boolean
  setHighlightWordsEnabled: (enabled: boolean) => void
  fontSize: number
  setFontSize: (size: number) => void
  editorSettings: EditorSettings
  editorRef?: React.RefObject<EditorHandle>
  step: string
  toggleHighlightNumerics: () => void
  diffToggleEnabled: boolean
  setDiffToggleEnabled: (enabled: boolean) => void
}

export default memo(function Header({
  getAudioPlayer,
  quillRef,
  orderDetails,
  toggleFindAndReplace,
  waveformUrl,
  highlightWordsEnabled,
  setHighlightWordsEnabled,
  fontSize,
  setFontSize,
  editorSettings,
  editorRef,
  step,
  toggleHighlightNumerics,
  diffToggleEnabled,
  setDiffToggleEnabled,

}: HeaderProps) {
  // const [currentValue, setCurrentValue] = useState(0)
  // const [currentTime, setCurrentTime] = useState('00:00')
  const [audioDuration, setAudioDuration] = useState(0)
  const audioPlayer = useRef<HTMLAudioElement>(null)
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false)
  const [selection, setSelection] = useState<{
    index: number
    length: number
  } | null>(null)
  const [adjustTimestampsBy, setAdjustTimestampsBy] = useState('0')
  const [audioUrl, setAudioUrl] = useState('')
  const [speed, setSpeed] = useState(editorSettings.playbackSpeed)
  const [volumePercentage, setVolumePercentage] = useState(
    editorSettings.volume
  )
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)

  useEffect(() => {
    if (quillRef?.current) {
      const container = quillRef.current.getEditor().container as HTMLElement
      container.style.fontSize = `${editorSettings.fontSize}px`
    }

    setSpeed(editorSettings.playbackSpeed)
    setFontSize(editorSettings.fontSize)
    setVolumePercentage(editorSettings.volume)
  }, [editorSettings, quillRef, audioPlayer, isAudioInitialized])

  const setSelectionHandler = () => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    const range = quill.getSelection()
    if (range) {
      setSelection({ index: range.index, length: range.length })
    } else {
      setSelection(null)
    }
  }

  const playNextBlankInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    navigateAndPlayBlanks(quill, audioPlayer.current, false)
  }, [audioPlayer, quillRef])

  const playPreviousBlankInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    navigateAndPlayBlanks(quill, audioPlayer.current, true)
  }, [audioPlayer, quillRef])

  const playCurrentParagraphInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    playCurrentParagraphTimestamp(quill, audioPlayer.current)
  }, [audioPlayer, quillRef])

  const adjustTimestampsInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    return adjustTimestamps(quill, Number(adjustTimestampsBy), selection)
  }, [audioPlayer, quillRef, adjustTimestampsBy])

  const handleAdjustTimestamps = () => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    if (Number(adjustTimestampsBy) === 0) {
      toast.error(
        'Please enter a valid number of seconds to adjust timestamps by'
      )
      return
    }
    adjustTimestampsInstance()
  }

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

  const increaseFontSize = () => adjustFontSize(true)
  const decreaseFontSize = () => adjustFontSize(false)

  const shortcutControls = useMemo(
    () =>
      createShortcutControls(
        audioPlayer,
        quillRef?.current?.getEditor() || null,
        setSpeed,
        setVolumePercentage,
        editorSettings
      ),
    [audioPlayer, quillRef, editorSettings]
  )

  useShortcuts(shortcutControls as ShortcutControls)

  const fetchAudioUrl = async () => {
    try {
      const { success, signedUrl } = await getSignedUrlAction(
        `${orderDetails.fileId}.mp3`,
        Math.max(Number(orderDetails.duration) * 4, 1800)
      )
      if (success && signedUrl) {
        setAudioUrl(signedUrl)
      } else {
        throw new Error('Failed to fetch audio file')
      }
    } catch (error) {
      toast.error('Failed to fetch audio file')
    }
  }

  useEffect(() => {
    if (!orderDetails.fileId) return
    fetchAudioUrl()
  }, [orderDetails.fileId])

  useEffect(() => {
    const audio = audioPlayer.current
    if (!audio || !audioUrl) return

    // Initialize audio and pass to parent immediately
    if (!audio.src || audio.src !== audioUrl) {
      audio.src = audioUrl
    }

    // Always pass the audio player reference to parent
    if (getAudioPlayer) {
      getAudioPlayer(audio)
    }

    const handleLoadStart = () => {
      // Audio loading started
    }

    const handleCanPlayThrough = () => {
      // Only set player loaded on initial load
      if (!audio.currentTime) {
        setIsPlayerLoaded(true)
      }
    }

    const handleLoadedMetadata = () => {
      if (!audioDuration) {
        setAudioDuration(audio.duration)
      }
    }

    const handleError = (e: ErrorEvent) => {
      console.error('Audio loading error:', e)
      setIsPlayerLoaded(false)
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplaythrough', handleCanPlayThrough)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('error', handleError)
    }
  }, [audioUrl, getAudioPlayer])

  const editorShortcutControls = useMemo(() => {
    const controls: Partial<ShortcutControls> = {
      playNextBlank: playNextBlankInstance,
      playPreviousBlank: playPreviousBlankInstance,
      playAudioFromTheStartOfCurrentParagraph: playCurrentParagraphInstance,
    }
    return controls as ShortcutControls
  }, [
    playNextBlankInstance,
    playPreviousBlankInstance,
    playCurrentParagraphInstance,
  ])

  useShortcuts(editorShortcutControls)

  const insertTimestampBlankAtCursorPositionInstance = useCallback(() => {
    insertTimestampBlankAtCursorPosition(
      audioPlayer.current,
      quillRef?.current?.getEditor()
    )
  }, [audioPlayer, quillRef])

  const markSection = () => {
    if (!quillRef?.current) return

    const quill = quillRef.current.getEditor()
    const range = quill.getSelection()

    if (!range) {
      toast.error('Please select the heading to mark.')
      return
    }

    const selectedText = quill.getText(range.index, range.length).trim()

    const validHeadings = [
      'EXAMINATION',
      'PROCEEDINGS',
      'EXAMINATION-CONTINUES',
      'FURTHER EXAMINATION',
    ]

    if (!validHeadings.includes(selectedText.toUpperCase())) {
      toast.error('Only Proceedings/Examination can be marked.')
      return
    }

    const nextChar = quill.getText(range.index + range.length, 1)
    const wrappedText = `[--${selectedText.toUpperCase()}--]${
      nextChar === '\n' ? '\n' : '\n\n'
    }`
    quill.deleteText(range.index, range.length, 'user')
    quill.insertText(range.index, wrappedText, 'user')

    toast.success(`Marked as start of ${selectedText}`)
  }

  const markExaminee = () => {
    if (!quillRef?.current) return

    const quill = quillRef.current.getEditor()
    const range = quill.getSelection()

    if (!range) {
      toast.error('Please select the text to mark.')
      return
    }

    const selectedText = quill.getText(range.index, range.length)
    const wrappedText = `[--EXAMINEE--${selectedText.toUpperCase()}--EXAMINEE--]`

    quill.deleteText(range.index, range.length, 'user')
    quill.insertText(range.index, wrappedText, 'user')

    toast.success('Marked as continuation of examination')
  }

  const insertSwearInLine = () => {
    if (!quillRef?.current) return

    const quill = quillRef.current.getEditor()
    const range = quill.getSelection()

    if (!range) {
      toast.error('Please place cursor where you want to insert the text')
      return
    }

    const textToInsert =
      'WHEREUPON, [--EXAMINEE--<replace_with_examinee_name>--EXAMINEE--] having been called as a witness, being duly sworn by the notary public present, testified as follows:'

    quill.insertText(range.index, textToInsert, 'user')

    toast.success('Inserted swear in line text')
  }

  const insertInterpreterSwearInLine = () => {
    if (!quillRef?.current) return

    const quill = quillRef.current.getEditor()
    const range = quill.getSelection()

    if (!range) {
      toast.error('Please place cursor where you want to insert the text')
      return
    }

    const textToInsert =
      'WHEREUPON, [--INTERPRETER--<replace_with_interpreter_name>--INTERPRETER--] the interpreter was duly sworn.'

    quill.insertText(range.index, textToInsert, 'user')

    toast.success('Inserted swear in line text')
  }

  const initializeAudio = useCallback(() => {
    if (!isAudioInitialized && audioPlayer.current) {
      try {
        audioContextRef.current = new (window.AudioContext ||
          (window as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext ||
          AudioContext)()
        sourceNodeRef.current =
          audioContextRef.current.createMediaElementSource(audioPlayer.current)
        gainNodeRef.current = audioContextRef.current.createGain()

        sourceNodeRef.current.connect(gainNodeRef.current)
        gainNodeRef.current.connect(audioContextRef.current.destination)

        // Set initial gain based on audio element's volume
        if (gainNodeRef.current && audioPlayer.current) {
          gainNodeRef.current.gain.value = audioPlayer.current.volume
        }

        setIsAudioInitialized(true)
      } catch (error) {
        console.error('Failed to initialize Web Audio API:', error)
      }
    }
  }, [isAudioInitialized])

  // Update gain node when volume changes
  useEffect(() => {
    if (isAudioInitialized && gainNodeRef.current && audioPlayer.current) {
      gainNodeRef.current.gain.value = volumePercentage / 100
    }
  }, [isAudioInitialized, volumePercentage])

  useEffect(() => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate = speed / 100
    }
  }, [isAudioInitialized, speed])

  // Cleanup Web Audio API on unmount
  useEffect(
    () => () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    },
    []
  )

  const removeTimestamps = useCallback(() => {
    if (editorRef?.current) {
      editorRef.current.removeTimestamps();
    }
  }, [editorRef]);

  const handleUndo = () => {
    if (editorRef?.current) {
      editorRef.current.handleUndo();
    }
  }

  const handleRedo = () => {
    if (editorRef?.current) {
      editorRef.current.handleRedo();
    }
  }

  const generateTranscriptFromDiff = () => {
    const newDiffToggleValue = !diffToggleEnabled;
    setDiffToggleEnabled(newDiffToggleValue);
    // if (editorRef?.current) {
    //   editorRef.current.generateTranscriptFromDiff(newDiffToggleValue);
    // }
  };
  
  return (
    <div className='border bg-background border-customBorder rounded-md relative'>
      {!isPlayerLoaded && (
        <div className='absolute inset-0 w-full h-full bg-background z-50 flex justify-center items-center rounded-md'>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          <span>Loading...</span>
        </div>
      )}
      <div className='h-12'>
        <Waveform
          waveformUrl={waveformUrl}
          audioPlayer={audioPlayer}
          className="rounded-t-md"
          backgroundSize="100% 200%"
          backgroundPosition="center top"
          showCurrentTimeLabel={true}
          showDurationLabel={true}
          onSeek={(time) => {
            if (audioPlayer.current) {
              audioPlayer.current.currentTime = time
              editorRef?.current?.scrollToCurrentWord()
            }
          }}
        />
      </div>

      <div className='flex flex-col justify-between p-2'>
        <audio
          ref={audioPlayer}
          className='hidden'
          src={audioUrl}
          preload='auto'
          crossOrigin='anonymous'
          onPlay={initializeAudio}
        ></audio>

        <div className='flex items-center h-full'>
          <div className='w-full flex justify-between'>
            <div className='flex items-center gap-x-2'>
              <TooltipProvider>
                <div className='flex items-center gap-x-1 bg-secondary rounded-sm'>
                  <Tooltip>
                    <TooltipTrigger>
                      <PlayerButton
                        icon={<TrackPreviousIcon className='w-4 h-4' />}
                        tooltip='Go back 10 seconds'
                        onClick={() => {
                          if (audioPlayer.current) {
                            audioPlayer.current.currentTime -= 10
                          }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Go back 10 seconds</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <PlayerButton
                        icon={
                          !audioPlayer?.current?.paused ? (
                            <PauseIcon className='w-4 h-4' />
                          ) : (
                            <PlayIcon className='w-4 h-4' />
                          )
                        }
                        tooltip={
                          !audioPlayer?.current?.paused ? 'Pause' : 'Play'
                        }
                        onClick={() => {
                          if (!audioPlayer?.current?.paused) {
                            shortcutControls.pause()
                          } else {
                            shortcutControls.togglePlay()
                          }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{!audioPlayer?.current?.paused ? 'Pause' : 'Play'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <PlayerButton
                        icon={<TrackNextIcon className='w-4 h-4' />}
                        tooltip='Go forward 5 seconds'
                        onClick={() => {
                          if (audioPlayer.current) {
                            audioPlayer.current.currentTime += 10
                          }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Go forward 10 seconds</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <PlayerButton
                        icon={<DoubleArrowUpIcon className='w-4 h-4' />}
                        tooltip='Fast forward'
                        onClick={shortcutControls.increasePlaybackSpeed}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Increase playback speed</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <PlayerButton
                        icon={<DoubleArrowDownIcon className='w-4 h-4' />}
                        tooltip='Rewind'
                        onClick={shortcutControls.decreasePlaybackSpeed}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Decrease playback speed</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <PlayerButton
                        icon={<SpeakerLoudIcon className='w-4 h-4' />}
                        tooltip='Increase volume'
                        onClick={shortcutControls.increaseVolume}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Increase volume</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <PlayerButton
                        icon={<SpeakerQuietIcon className='w-4 h-4' />}
                        tooltip='Decrease volume'
                        onClick={shortcutControls.decreaseVolume}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Decrease volume</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className='h-full w-[1.2px] rounded-full bg-gray-200 dark:bg-gray-600'></div>

                <div className='flex items-center gap-x-1 bg-secondary rounded-sm'>
                  <Toolbar
                    orderDetails={orderDetails}
                    setSelectionHandler={setSelectionHandler}
                    playNextBlankInstance={playNextBlankInstance}
                    playPreviousBlankInstance={playPreviousBlankInstance}
                    playCurrentParagraphInstance={playCurrentParagraphInstance}
                    insertTimestampBlankAtCursorPositionInstance={
                      insertTimestampBlankAtCursorPositionInstance
                    }
                    toggleFindAndReplace={toggleFindAndReplace}
                    markSection={markSection}
                    markExaminee={markExaminee}
                    insertSwearInLine={insertSwearInLine}
                    adjustTimestampsBy={adjustTimestampsBy}
                    setAdjustTimestampsBy={setAdjustTimestampsBy}
                    handleAdjustTimestamps={handleAdjustTimestamps}
                    increaseFontSize={increaseFontSize}
                    decreaseFontSize={decreaseFontSize}
                    insertInterpreterSwearInLine={insertInterpreterSwearInLine}
                    highlightWordsEnabled={highlightWordsEnabled}
                    setHighlightWordsEnabled={setHighlightWordsEnabled}
                    step={step}
                    removeTimestamps={removeTimestamps}
                    toggleHighlightNumerics={toggleHighlightNumerics}
                    handleUndo={handleUndo}
                    handleRedo={handleRedo}
                    generateTranscriptFromDiff={generateTranscriptFromDiff}
                    diffToggleEnabled={diffToggleEnabled}
                  />
                </div>
              </TooltipProvider>
            </div>
            <div className='flex gap-2'>
              <div className='inline-flex items-center bg-primary/10 text-primary rounded-md px-1 text-xs font-semibold shadow-sm ring-1 ring-inset ring-primary/20'>
                <span className='mr-0.5'>Speed: </span>
                <span className='tabular-nums'>{speed}%</span>
              </div>
              <div className='inline-flex items-center bg-primary/10 text-primary rounded-md px-1 text-xs font-semibold shadow-sm ring-1 ring-inset ring-primary/20'>
                <span className='mr-0.5'>Volume: </span>
                <span>{volumePercentage}%</span>
              </div>
              <div className='inline-flex items-center bg-primary/10 text-primary rounded-md px-1 text-xs font-semibold shadow-sm ring-1 ring-inset ring-primary/20'>
                <span className='mr-0.5'>Font: </span>
                <span>{fontSize}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
