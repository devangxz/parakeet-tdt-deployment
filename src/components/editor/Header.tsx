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
import { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import PlayerButton from './PlayerButton'
import Toolbar from './Toolbar'
import { getSpeakerNamesAction } from '@/app/actions/editor/get-speaker-names'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import 'rc-slider/assets/index.css'
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
import formatDuration from '@/utils/formatDuration'

const createShortcutControls = (
  audioPlayer: React.RefObject<HTMLAudioElement>,
  quill: Quill | null
): ShortcutControls => ({
  togglePlay: () => {
    if (!audioPlayer.current) return
    audioPlayer.current.paused
      ? audioPlayer.current.play()
      : audioPlayer.current.pause()
  },
  pause: () => {
    audioPlayer.current?.pause()
  },
  skipAudio: (seconds: number) => {
    if (audioPlayer.current) {
      audioPlayer.current.currentTime += seconds
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
    if (audioPlayer.current) {
      audioPlayer.current.volume = Math.min(1, audioPlayer.current.volume + 0.1)
    }
  },
  decreaseVolume: () => {
    if (audioPlayer.current) {
      audioPlayer.current.volume = Math.max(0, audioPlayer.current.volume - 0.1)
    }
  },
  increasePlaybackSpeed: () => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate += 0.1
    }
  },
  decreasePlaybackSpeed: () => {
    if (audioPlayer.current) {
      audioPlayer.current.playbackRate = Math.max(
        0.1,
        audioPlayer.current.playbackRate - 0.1
      )
    }
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
})

interface HeaderProps {
  getAudioPlayer?: (audioPlayer: HTMLAudioElement | null) => void
  quillRef: React.RefObject<ReactQuill> | undefined
  orderDetails: OrderDetails
  submitting: boolean
  setIsSubmitModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggleFindAndReplace: () => void
  highlightWordsEnabled: boolean
  setHighlightWordsEnabled: (enabled: boolean) => void
}

export default memo(function Header({
  getAudioPlayer,
  quillRef,
  orderDetails,
  submitting,
  setIsSubmitModalOpen,
  toggleFindAndReplace,
  highlightWordsEnabled,
  setHighlightWordsEnabled,
}: HeaderProps) {
  const [currentValue, setCurrentValue] = useState(0)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [audioDuration, setAudioDuration] = useState(0)
  const audioPlayer = useRef<HTMLAudioElement>(null)
  const [waveformUrl, setWaveformUrl] = useState('')
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false)
  const [selection, setSelection] = useState<{
    index: number
    length: number
  } | null>(null)
  const [adjustTimestampsBy, setAdjustTimestampsBy] = useState('0')
  const [isSpeakerNameModalOpen, setIsSpeakerNameModalOpen] = useState(false)
  const [speakerName, setSpeakerName] = useState<{
    [key: string]: string
  } | null>(null)
  const [step, setStep] = useState<string>('')
  const [cfd, setCfd] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [speed, setSpeed] = useState(100)
  const [volume, setVolume] = useState(100)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window !== 'undefined' && quillRef?.current) {
      const quill = quillRef.current.getEditor()
      const container = quill.container as HTMLElement
      return parseInt(window.getComputedStyle(container).fontSize)
    }
    return 16
  })

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

  useEffect(() => {
    if (cfd && step) return
    setCfd(orderDetails.cfd)
    const cfStatus = [
      'FORMATTED',
      'REVIEWER_ASSIGNED',
      'REVIEW_COMPLETED',
      'FINALIZER_ASSIGNED',
      'FINALIZER_COMPLETED',
    ]
    let currentStep = 'QC'
    if (cfStatus.includes(orderDetails.status)) {
      currentStep = 'CF'
    }

    if (orderDetails.status === 'PRE_DELIVERED') {
      if (orderDetails.orderType === 'TRANSCRIPTION_FORMATTING') {
        currentStep = 'CF'
      } else {
        currentStep = 'QC'
      }
    }

    setStep(currentStep)
  }, [orderDetails])

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
      const newSize = increase ? currentSize + 2 : currentSize - 2
      container.style.fontSize = `${newSize}px`
      setFontSize(Math.max(newSize, 0))
    },
    [quillRef]
  )

  const increaseFontSize = () => adjustFontSize(true)
  const decreaseFontSize = () => adjustFontSize(false)

  const shortcutControls = useMemo(
    () =>
      createShortcutControls(
        audioPlayer,
        quillRef?.current?.getEditor() || null
      ),
    [audioPlayer, quillRef]
  )

  useShortcuts(shortcutControls as ShortcutControls)

  const fetchWaveform = async () => {
    try {
      const res = await getSignedUrlAction(`${orderDetails.fileId}_wf.png`, 300)
      if (res.success && res.signedUrl) {
        setWaveformUrl(res.signedUrl)
      } else {
        throw new Error('Failed to load waveform')
      }
    } catch (error) {
      setWaveformUrl('/assets/images/fallback-waveform.png')
    } finally {
      setIsPlayerLoaded(true)
    }
  }

  const fetchAudioUrl = async () => {
    try {
      console.log('Fetching audio URL for fileId:', orderDetails.fileId)
      const { success, signedUrl } = await getSignedUrlAction(
        `${orderDetails.fileId}.mp3`,
        Math.max(Number(orderDetails.duration) * 4, 1800)
      )
      if (success && signedUrl) {
        console.log('Got signed URL:', signedUrl)
        setAudioUrl(signedUrl)
      } else {
        throw new Error('Failed to fetch audio file')
      }
    } catch (error) {
      console.error('Error fetching audio:', error)
      toast.error('Failed to fetch audio file')
    }
  }

  useEffect(() => {
    if (!orderDetails.fileId) return
    fetchWaveform()
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
        setSpeed(audio.playbackRate * 100)
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

  const seekTo = (value: number) => {
    if (!audioPlayer.current) return
    const duration = audioPlayer.current.duration
    if (duration) {
      const time = (value / 100) * duration
      audioPlayer.current.currentTime = time
      if (audioPlayer.current.paused) {
        audioPlayer.current.play()
      }
    }
  }

  useEffect(() => {
    const audio = audioPlayer.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const currentTime = formatDuration(audio.currentTime)
      setCurrentTime(currentTime)
      const playedPercentage = (audio.currentTime / audio.duration) * 100
      setCurrentValue(playedPercentage)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [])

  const handleMouseMoveOnWaveform = (e: React.MouseEvent<HTMLDivElement>) => {
    if (typeof document === 'undefined') return // Ensure code runs only in the browser

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    if (audioPlayer.current?.duration) {
      const time = (percentage / 100) * audioPlayer.current.duration
      const timeString = formatDuration(time)

      const tooltip = document.getElementById('time-tooltip')
      if (tooltip) {
        tooltip.style.display = 'block'
        tooltip.style.left = `${e.clientX}px`
        tooltip.style.top = `${e.clientY - 25}px`
        tooltip.textContent = timeString
      }
    }
  }

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

  const toggleSpeakerName = async () => {
    try {
      if (quillRef && quillRef.current) {
        // Removed !speakerName condition to re-fetch every time
        const quill = quillRef.current.getEditor()
        const text = quill.getText()
        const speakerRegex = /\d{1,2}:\d{2}:\d{2}\.\d\s+(S\d+):/g
        const speakerOrder: string[] = []
        let match

        // Collect speakers in order of appearance
        while ((match = speakerRegex.exec(text)) !== null) {
          const speaker = match[1]
          if (!speakerOrder.includes(speaker)) {
            speakerOrder.push(speaker)
          }
        }

        const response = await getSpeakerNamesAction(orderDetails.fileId)
        const speakerNamesList = response.data
        const newSpeakerNames: Record<string, string> = {}

        // Map speaker names based on order of appearance
        speakerOrder.forEach((speaker) => {
          const speakerNumber = parseInt(speaker.replace('S', '')) - 1
          // Preserve existing speaker names if they exist
          if (speakerName && speakerName[speaker]) {
            newSpeakerNames[speaker] = speakerName[speaker]
          } else if (
            speakerNamesList &&
            speakerNamesList[speakerNumber] &&
            (speakerNamesList[speakerNumber].fn ||
              speakerNamesList[speakerNumber].ln)
          ) {
            const { fn, ln } = speakerNamesList[speakerNumber]
            newSpeakerNames[speaker] = `${fn} ${ln}`.trim()
          } else {
            newSpeakerNames[speaker] = `Speaker ${speakerNumber + 1}`
          }
        })

        // Add any remaining speakers from the API that weren't in the transcript
        const maxSpeakerNumber = Math.max(
          ...speakerOrder.map((s) => parseInt(s.replace('S', ''))),
          speakerNamesList.length
        )

        for (let i = 1; i <= maxSpeakerNumber; i++) {
          const speaker = `S${i}`
          if (!newSpeakerNames[speaker]) {
            if (speakerName && speakerName[speaker]) {
              newSpeakerNames[speaker] = speakerName[speaker]
            } else if (
              speakerNamesList &&
              speakerNamesList[i - 1] &&
              (speakerNamesList[i - 1].fn || speakerNamesList[i - 1].ln)
            ) {
              const { fn, ln } = speakerNamesList[i - 1]
              newSpeakerNames[speaker] = `${fn} ${ln}`.trim()
            } else {
              newSpeakerNames[speaker] = `Speaker ${i}`
            }
          }
        }

        setSpeakerName(newSpeakerNames) // Replace instead of merge with previous state
      }
      setIsSpeakerNameModalOpen(!isSpeakerNameModalOpen)
    } catch (error) {
      toast.error('An error occurred while opening the speaker name modal')
    }
  }

  useEffect(() => {
    if (submitting && orderDetails.status === 'QC_ASSIGNED') {
      toggleSpeakerName()
    }
    if (submitting && orderDetails.status !== 'QC_ASSIGNED') {
      setIsSubmitModalOpen(true)
    }
  }, [submitting])

  const insertTimestampBlankAtCursorPositionInstance = useCallback(() => {
    insertTimestampBlankAtCursorPosition(
      audioPlayer.current,
      quillRef?.current?.getEditor()
    )
  }, [audioPlayer, quillRef])

  useEffect(() => {
    const audio = audioPlayer.current
    if (!audio) return

    const handleVolumeChange = () => {
      setVolume(Math.round(audio.volume * 100))
    }

    const handleRateChange = () => {
      setSpeed(Math.round(audio.playbackRate * 100))
    }

    audio.addEventListener('volumechange', handleVolumeChange)
    audio.addEventListener('ratechange', handleRateChange)

    return () => {
      audio.removeEventListener('volumechange', handleVolumeChange)
      audio.removeEventListener('ratechange', handleRateChange)
    }
  }, [audioPlayer])

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

  return (
    <div className='border bg-white border-customBorder rounded-md relative'>
      {!isPlayerLoaded && (
        <div className='absolute inset-0 w-full h-full bg-white z-50 flex justify-center items-center'>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          <span>Loading...</span>
        </div>
      )}
      <div className='h-12'>
        <div
          id='waveform'
          className='relative h-full overflow-hidden cursor-pointer'
          onMouseMove={handleMouseMoveOnWaveform}
          onMouseLeave={() => {
            if (typeof document === 'undefined') return

            const tooltip = document.getElementById('time-tooltip')
            if (tooltip) {
              tooltip.style.display = 'none'
            }
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = (x / rect.width) * 100
            seekTo(percentage)
          }}
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url(${waveformUrl}), url('/assets/images/fallback-waveform.png')`,
            backgroundSize: '100% 200%', // Double the height
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top', // Position at top
          }}
        >
          <div
            id='time-tooltip'
            className='fixed hidden z-50 bg-primary text-white px-1 py-0.5 rounded text-[11px] pointer-events-none'
            style={{ transform: 'translate(-50%, 200%)' }}
          />
          <div
            className='absolute top-0 left-0 h-full bg-primary/20'
            style={{
              width: `${currentValue}%`,
              transition: 'width 0.1s linear',
            }}
          />
          <span className='absolute top-0 left-0 bg-primary text-white px-1 py-0.5 rounded text-[11px]'>
            {currentTime}
          </span>
          <span className='absolute top-0 right-0 bg-primary text-white px-1 py-0.5 rounded text-[11px]'>
            {formatDuration(audioDuration)}
          </span>
        </div>
      </div>

      <div className='flex flex-col justify-between p-2'>
        <audio
          ref={audioPlayer}
          className='hidden'
          src={audioUrl}
          preload='auto'
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
                            audioPlayer.current.currentTime -= 5
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
                            audioPlayer.current.currentTime += 5
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

                <div className='h-full w-[1.2px] rounded-full bg-gray-200'></div>

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
                <span>{volume}%</span>
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
