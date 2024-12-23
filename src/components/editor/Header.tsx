'use client'

import {
  CaretDownIcon,
  Cross1Icon,
  ReloadIcon,
  PlayIcon,
  PauseIcon,
  DoubleArrowUpIcon,
  DoubleArrowDownIcon,
  ClockIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ThickArrowLeftIcon,
  ThickArrowRightIcon,
  TextAlignLeftIcon,
  SpeakerQuietIcon,
  SpeakerLoudIcon,
  TrackPreviousIcon,
  TrackNextIcon,
  TimerIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons'
import { PlusIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import ConfigureShortcutsDialog from './ConfigureShortcutsDialog'
import DownloadDocxDialog from './DownloadDocxDialog'
import FrequentTermsDialog from './FrequentTermsDialog'
import ReportDialog from './ReportDialog'
import ShortcutsReferenceDialog from './ShortcutsReferenceDialog'
import { LineData } from './transcriptUtils'
import UploadDocxDialog from './UploadDocxDialog'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Textarea } from '../ui/textarea'
import { getFormattingOptionsAction } from '@/app/actions/editor/get-formatting-options'
import { getSpeakerNamesAction } from '@/app/actions/editor/get-speaker-names'
import { requestReReviewAction } from '@/app/actions/editor/re-review'
import { requestExtensionAction } from '@/app/actions/editor/request-extension'
import { setFormattingOptionsAction } from '@/app/actions/editor/set-formatting-options'
import { updateSpeakerNameAction } from '@/app/actions/editor/update-speaker-name'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import 'rc-slider/assets/index.css'
import { FILE_CACHE_URL } from '@/constants'
import axiosInstance from '@/utils/axios'
import DefaultShortcuts, {
  getAllShortcuts,
  setShortcut,
  ShortcutControls,
  useShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  adjustTimestamps,
  downloadBlankDocx,
  downloadMP3,
  getFrequentTermsHandler,
  handleSave,
  insertTimestampBlankAtCursorPosition,
  navigateAndPlayBlanks,
  playCurrentParagraphTimestamp,
  regenDocx,
} from '@/utils/editorUtils'

type PlayerButtonProps = {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
}

function PlayerButton({ icon, tooltip, onClick }: PlayerButtonProps) {
  return (
    <button
      aria-label={tooltip}
      onClick={onClick}
      className='w-8 h-8 bg-[#EEE9FF] flex items-center justify-center rounded p-1 mx-[2px]'
    >
      {icon}
    </button>
  )
}

const createShortcutControls = (
  audioPlayer: React.RefObject<HTMLAudioElement>
): Partial<ShortcutControls> => ({
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
      audioPlayer.current.playbackRate -= 0.1
    }
  },
})

interface PlayerEvent {
  t: number
  s: number
}

interface NewPlayerProps {
  getAudioPlayer?: (audioPlayer: HTMLAudioElement | null) => void
  quillRef: React.RefObject<ReactQuill> | undefined
  editorModeOptions: string[]
  getEditorMode: (editorMode: string) => void
  editorMode: string
  notes: string
  orderDetails: OrderDetails
  submitting: boolean
  setIsSubmitModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  lines: LineData[]
  playerEvents: PlayerEvent[]
  setPdfUrl: React.Dispatch<React.SetStateAction<string>>
  setRegenCount: React.Dispatch<React.SetStateAction<number>>
  setFileToUpload: React.Dispatch<
    React.SetStateAction<{
      renamedFile: File | null
      originalFile: File | null
      isUploaded?: boolean
    }>
  >
  fileToUpload: {
    renamedFile: File | null
    originalFile: File | null
    isUploaded?: boolean
  },
  toggleFindAndReplace: () => void
}

export default function Header({
  getAudioPlayer,
  quillRef,
  editorModeOptions,
  getEditorMode,
  editorMode,
  notes,
  orderDetails,
  submitting,
  setIsSubmitModalOpen,
  setSubmitting,
  lines,
  playerEvents,
  setPdfUrl,
  setRegenCount,
  setFileToUpload,
  fileToUpload,
  toggleFindAndReplace,
}: NewPlayerProps) {
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
  const [newEditorMode, setNewEditorMode] = useState<string>('')
  const [notesOpen, setNotesOpen] = useState(true)
  const [shortcuts, setShortcuts] = useState<
    { key: string; shortcut: string }[]
  >([])
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false)
  const [revertTranscriptOpen, setRevertTranscriptOpen] = useState(false)
  const [isSpeakerNameModalOpen, setIsSpeakerNameModalOpen] = useState(false)
  const [speakerName, setSpeakerName] = useState<{
    [key: string]: string
  } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [autoCapitalize, setAutoCapitalize] = useState(true)
  const autoCapitalizeRef = useRef(autoCapitalize)
  const previousEditorContentRef = useRef('')
  const [isShortcutsReferenceModalOpen, setIsShortcutsReferenceModalOpen] =
    useState(false)
  const [isConfigureShortcutsModalOpen, setIsConfigureShortcutsModalOpen] =
    useState(false)
  const { data: session } = useSession()
  const [isFormattingOptionsModalOpen, setIsFormattingOptionsModalOpen] =
    useState(false)
  const [formattingOptions, setFormattingOptions] = useState({
    timeCoding: true,
    speakerTracking: true,
    nameFormat: 'initials',
  })
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportDetails, setReportDetails] = useState({
    reportOption: '',
    reportComment: '',
  })
  const [buttonLoading, setButtonLoading] = useState({
    download: false,
    upload: false,
    submit: false,
    save: false,
    report: false,
    regenDocx: false,
    mp3: false,
    frequentTerms: false,
  })
  const [allPublicTemplates, setAllPublicTemplates] = useState<
    { name: string; id: string }[]
  >([])
  const [currentTemplate, setCurrentTemplate] = useState('1')

  const [existingOptions, setExistingOptions] = useState<string>('')
  const [frequentTermsModalOpen, setFrequentTermsModalOpen] = useState(false)
  const [frequentTermsData, setFrequentTermsData] = useState({
    autoGenerated: '',
    edited: '',
  })
  const [step, setStep] = useState<string>('')
  const [cfd, setCfd] = useState('')
  const [downloadableType, setDownloadableType] = useState('marking')
  const [reReviewComment, setReReviewComment] = useState('')

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

  const playNextBlankInstance = () => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    return navigateAndPlayBlanks.bind(
      null,
      quill,
      audioPlayer.current,
      false
    )
  }

  const playPreviousBlankInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    return navigateAndPlayBlanks.bind(
      null,
      quill,
      audioPlayer.current,
      true
    )
  }, [audioPlayer, quillRef])

  const playCurrentParagraphInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    return playCurrentParagraphTimestamp.bind(
      null,
      quill,
      audioPlayer.current,
    )
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
      if (increase) {
        container.style.fontSize = `${currentSize + 2}px`
      } else {
        container.style.fontSize = `${currentSize - 2}px`
      }
    },
    [quillRef]
  )

  const increaseFontSize = () => adjustFontSize(true)
  const decreaseFontSize = () => adjustFontSize(false)

  const shortcutControls = useMemo(
    () => createShortcutControls(audioPlayer),
    [audioPlayer]
  )

  useShortcuts(shortcutControls as ShortcutControls)

  const fetchWaveform = async () => {
    try {
      const res = await axiosInstance.get(
        `${FILE_CACHE_URL}/get-waveform/${orderDetails.fileId}`,
        { responseType: 'blob' }
      )
      const waveformUrl = URL.createObjectURL(res.data)
      setWaveformUrl(waveformUrl)
      setIsPlayerLoaded(true)
    } catch (error) {
      toast.error('Failed to load waveform.')
    }
  }

  useEffect(() => {
    if (!orderDetails.fileId) return
    fetchWaveform()
  }, [orderDetails.fileId])

  useEffect(() => {
    const audio = audioPlayer.current
    if (!audio) return
    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration)
      if (getAudioPlayer) getAudioPlayer(audio)
    }
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [audioPlayer, getAudioPlayer])

  const seekTo = (value: number) => {
    if (!audioPlayer.current) return
    const duration = audioPlayer.current.duration
    if (duration) {
      const time = (value / 100) * duration
      audioPlayer.current.currentTime = time
    }
  }

  const formatTime = (seconds: number | undefined): string => {
    if (!seconds) return '00:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
    const formattedSeconds =
      remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds

    if (hours > 0) {
      return `${hours}:${formattedMinutes}:${formattedSeconds}`
    } else {
      return `${formattedMinutes}:${formattedSeconds}`
    }
  }

  useEffect(() => {
    const audio = audioPlayer.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const currentTime = formatTime(audio.currentTime)
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
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    if (audioPlayer.current?.duration) {
      const time = (percentage / 100) * audioPlayer.current.duration
      const timeString = formatTime(time)

      const tooltip = document.getElementById('time-tooltip')
      if (tooltip) {
        tooltip.style.display = 'block'
        tooltip.style.left = `${e.clientX}px`
        tooltip.style.top = `${e.clientY - 25}px`
        tooltip.textContent = timeString
      }
    }
  }

  const getFormattingOptions = async () => {
    try {
      const response = await getFormattingOptionsAction(
        Number(orderDetails.orderId)
      )
      const { options, templates, currentTemplate } = response
      setFormattingOptions({
        timeCoding: options.ts === 1,
        speakerTracking: options.sif === 1,
        nameFormat: options.si === 0 ? 'initials' : 'full-names',
      })
      if (templates) {
        setAllPublicTemplates(
          templates?.map((temp: { name: string; id: number }) => ({
            ...temp,
            id: temp.id.toString(),
          }))
        )
      }
      if (currentTemplate) {
        setCurrentTemplate(currentTemplate?.id.toString())
      }
      setExistingOptions(JSON.stringify(options))
    } catch (error) {
      toast.error('Failed to fetch formatting options')
    }
  }

  useEffect(() => {
    if (orderDetails.orderId) {
      getFormattingOptions()
    }
  }, [orderDetails.orderId])

  useEffect(() => {
    setShortcuts(getAllShortcuts())
  }, [])

  const updateShortcut = (
    action: keyof DefaultShortcuts,
    newShortcut: string
  ) => {
    setShortcut(action, newShortcut)
    setShortcuts(getAllShortcuts())
  }

  useEffect(() => {
    autoCapitalizeRef.current = autoCapitalize
  }, [autoCapitalize])

  const editorShortcutControls = useMemo(() => {
    const controls: Partial<ShortcutControls> = {
      playNextBlank: playNextBlankInstance(),
      playPreviousBlank: playPreviousBlankInstance(),
      playAudioFromTheStartOfCurrentParagraph: playCurrentParagraphInstance(),
    }
    return controls as ShortcutControls
  }, [
    playNextBlankInstance,
    playPreviousBlankInstance,
    playCurrentParagraphInstance,
  ])

  useShortcuts(editorShortcutControls)

  useEffect(() => {
    const syncVideoWithAudio = () => {
      if (!audioPlayer || !audioPlayer.current || !videoRef.current) return
      const player = audioPlayer.current
      videoRef.current.volume = 0
      player.onplay = () => videoRef.current?.play()
      player.onpause = () => videoRef.current?.pause()
      player.onseeked = () => {
        if (!videoRef.current) return

        videoRef.current.currentTime = player.currentTime
      }
      player.onseeking = () => {
        if (videoRef.current) videoRef.current.currentTime = player.currentTime
      }
    }

    syncVideoWithAudio()
    const interval = setInterval(() => {
      if (!audioPlayer || !audioPlayer.current || !videoRef.current) return
      if (
        videoRef.current &&
        audioPlayer.current.currentTime !== videoRef.current.currentTime
      ) {
        videoRef.current.currentTime = audioPlayer.current.currentTime
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [audioPlayer, videoRef, videoPlayerOpen])

  const toggleVideo = () => {
    setVideoPlayerOpen(!videoPlayerOpen)
  }

  const handleAutoCapitalize = useCallback(
    (
      delta: {
        ops: {
          insert?: string | object
          delete?: number
          retain?: number
          attributes?: { [key: string]: unknown }
        }[]
      },
      oldDelta: {
        ops: {
          insert?: string | object
          delete?: number
          retain?: number
          attributes?: { [key: string]: unknown }
        }[]
      },
      source: 'api' | 'user' | 'silent'
    ) => {
      if (!quillRef?.current || !autoCapitalizeRef.current || source !== 'user')
        return

      const quill = quillRef.current.getEditor()
      const newText = quill.getText()
      if (newText === previousEditorContentRef.current) return

      const change = delta.ops[0]

      const shouldCapitalize = (index: number): boolean =>
        index === 0 || (index > 0 && /[.!?]\s$/.test(newText.slice(0, index)))

      const capitalizeChar = (index: number): void => {
        const char = newText[index]
        if (/^[a-zA-Z]$/.test(char) && char !== char.toUpperCase()) {
          quill.deleteText(index, 1)
          quill.insertText(index, char.toUpperCase(), quill.getFormat())
          quill.setSelection(index + 1, 0)
        }
      }

      if (
        'insert' in change ||
        ('retain' in change &&
          newText.length > previousEditorContentRef.current.length)
      ) {
        const insertIndex = 'retain' in change ? change.retain || 0 : 0
        if (shouldCapitalize(insertIndex)) {
          capitalizeChar(insertIndex)
        }
      } else if ('delete' in change) {
        const deleteIndex = 'retain' in change ? change.retain || 0 : 0
        if (deleteIndex > 0 && shouldCapitalize(deleteIndex)) {
          capitalizeChar(deleteIndex)
        }
      }

      previousEditorContentRef.current = newText
    },
    [quillRef]
  )

  useEffect(() => {
    if (!quillRef?.current) return

    const quill = quillRef.current.getEditor()
    quill.on('text-change', handleAutoCapitalize)

    return () => {
      quill.off('text-change', handleAutoCapitalize)
    }
  }, [quillRef, handleAutoCapitalize])

  const handleDragChange = (
    e: React.MouseEvent<HTMLDivElement | HTMLVideoElement>
  ) => {
    e.preventDefault()
    const target = e.target as HTMLDivElement // Correctly typecast the event target
    const onMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - deltaX,
        y: moveEvent.clientY - deltaY,
      })
    }

    const deltaX = e.clientX - target.getBoundingClientRect().left
    const deltaY = e.clientY - target.getBoundingClientRect().top

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener(
      'mouseup',
      () => {
        document.removeEventListener('mousemove', onMouseMove)
      },
      { once: true }
    )
  }

  const toggleAutoCapitalize = () => {
    setAutoCapitalize(!autoCapitalize)
  }

  const toggleNotes = () => {
    setNotesOpen(!notesOpen)
  }

  const toggleRevertTranscript = () => {
    setRevertTranscriptOpen(!revertTranscriptOpen)
  }

  const toggleSpeakerName = async () => {
    // Extract unique speakers from the transcript
    try {
      if (quillRef && quillRef.current && !speakerName) {
        const quill = quillRef.current.getEditor()
        const text = quill.getText()
        const speakerRegex = /\d{1,2}:\d{2}:\d{2}\.\d\s+(S\d+):/g
        const speakers = new Set<string>()
        let match

        while ((match = speakerRegex.exec(text)) !== null) {
          speakers.add(match[1])
        }

        const response = await getSpeakerNamesAction(orderDetails.fileId)
        const speakerNamesList = response.data
        // Update the speakerName state
        const newSpeakerNames: Record<string, string> = {}
        const maxSpeakers = Math.max(speakers.size, speakerNamesList.length)

        for (let i = 0; i < maxSpeakers; i++) {
          const speaker = Array.from(speakers)[i] || `S${i + 1}`
          if (
            speakerNamesList &&
            speakerNamesList[i] &&
            (speakerNamesList[i].fn || speakerNamesList[i].ln)
          ) {
            const { fn, ln } = speakerNamesList[i]
            newSpeakerNames[speaker] = `${fn} ${ln}`.trim()
          } else {
            newSpeakerNames[speaker] = `Speaker ${i + 1}`
          }
        }

        setSpeakerName((prevState) => ({
          ...prevState,
          ...newSpeakerNames,
        }))
      }
      setIsSpeakerNameModalOpen(!isSpeakerNameModalOpen)
    } catch (error) {
      toast.error('An error occurred while opening the speaker name modal')
    }
  }

  const handleSpeakerNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string
  ) => {
    setSpeakerName((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const updateSpeakerName = async () => {
    const toastId = toast.loading('Updating speaker names...')
    try {
      if (!speakerName) {
        throw new Error('Speaker names cannot be empty')
      }
      await updateSpeakerNameAction(orderDetails.fileId, speakerName)
      toast.dismiss(toastId)
      toast.success('Speaker names updated successfully')
      setIsSpeakerNameModalOpen(false)
      if (submitting) {
        setIsSubmitModalOpen(true)
      }
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to update speaker names')
    }
  }

  const addSpeakerName = async () => {
    if (!speakerName) return
    const newKey = `S${Object.keys(speakerName).length + 1}`
    setSpeakerName((prev) => ({
      ...prev,
      [newKey]: 'Speaker ' + (Object.keys(speakerName).length + 1),
    }))
  }

  const revertTranscript = async () => {
    const toastId = toast.loading('Reverting transcript...')
    try {
      await axiosInstance.post(`${FILE_CACHE_URL}/revert-transcript`, {
        fileId: orderDetails.fileId,
        type: 'QC',
      })
      toast.success('Transcript reverted successfully')
      localStorage.removeItem('transcript')
      window.location.reload()
      return
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to revert transcript')
    }
  }

  const handleFormattingOptionChange = async () => {
    const toastId = toast.loading('Updating formatting options...')
    try {
      await setFormattingOptionsAction(
        Number(orderDetails.orderId),
        formattingOptions,
        JSON.parse(existingOptions),
        +currentTemplate
      )
      toast.dismiss(toastId)
      toast.success('Formatting options updated successfully')
      localStorage.removeItem('transcript')
      window.location.reload() // Refresh the page after success
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to update formatting options')
    }
  }

  const requestExtension = async () => {
    const toastId = toast.loading('Requesting extension...')
    try {
      await requestExtensionAction(Number(orderDetails.orderId))

      window.location.reload()
      toast.dismiss(toastId)
      toast.success('Extension requested successfully')
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to request extension')
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

  const getEditorText = useCallback(
    () => quillRef?.current?.getEditor().getText() || '',
    [quillRef]
  )

  const handleReReview = async () => {
    const toastId = toast.loading('Processing re-review request...')
    try {
      await requestReReviewAction(orderDetails.fileId, reReviewComment)
      toast.dismiss(toastId)
      const successToastId = toast.success(
        `Re-review request submitted successfully`
      )
      toast.dismiss(successToastId)
    } catch (error) {
      toast.error('Failed to re-review the file')
    }
  }

  const insertTimestampBlankAtCursorPositionInstance = useCallback(() => {
    insertTimestampBlankAtCursorPosition(
      audioPlayer.current,
      quillRef?.current?.getEditor()
    )
  }, [audioPlayer, quillRef])

  return (
    <div className='min-h-24 relative mx-2'>
      {!isPlayerLoaded && (
        <div className='absolute inset-0 w-full h-full bg-white z-50 flex justify-center items-center'>
          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          <span>Loading...</span>
        </div>
      )}
      <div className='h-1/2 bg-white border border-gray-200 border-b-0 overflow-hidden'>
        <div
          id='waveform'
          className='relative h-full overflow-hidden'
          onMouseMove={handleMouseMoveOnWaveform}
          onMouseLeave={() => {
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
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), url(${waveformUrl})`,
            backgroundSize: '100% 200%', // Double the height
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top', // Position at top
          }}
        >
          <div
            id='time-tooltip'
            className='fixed hidden z-50 bg-primary text-white px-2 py-1 rounded text-sm pointer-events-none'
            style={{ transform: 'translate(-50%, 150%)' }}
          />
          <div
            className='absolute top-0 left-0 h-full bg-primary/20'
            style={{
              width: `${currentValue}%`,
              transition: 'width 0.1s linear',
            }}
          />
          <span className='absolute top-0 left-0 bg-primary text-white px-2 py-1 rounded text-xs'>
            {currentTime}
          </span>
          <span className='absolute top-0 right-0 bg-primary text-white px-2 py-1 rounded text-xs'>
            {formatTime(audioDuration)}
          </span>
        </div>
      </div>

      <div className='h-1/2 bg-white border border-gray-200 px-3 flex flex-col justify-between rounded-b-2xl'>
        <audio
          ref={audioPlayer}
          className='hidden'
          src={`/api/editor/get-audio/${orderDetails.fileId}`}
        ></audio>

        <div className='flex items-center h-full'>
          <div className='w-full flex justify-between'>
            <div className='flex'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<TrackPreviousIcon />}
                      tooltip=''
                      onClick={() => shortcutControls.skipAudio?.(-10)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Go back 10 seconds</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<PlayIcon />}
                      tooltip='Play'
                      onClick={shortcutControls.togglePlay}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<PauseIcon />}
                      tooltip='Pause'
                      onClick={shortcutControls.pause}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pause</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<TrackNextIcon />}
                      tooltip='Go forward 10 seconds'
                      onClick={() => shortcutControls.skipAudio?.(10)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Go forward 10 seconds</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<DoubleArrowUpIcon />}
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
                      icon={<DoubleArrowDownIcon />}
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
                      icon={<SpeakerLoudIcon />}
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
                      icon={<SpeakerQuietIcon />}
                      tooltip='Decrease volume'
                      onClick={shortcutControls.decreaseVolume}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Decrease volume</p>
                  </TooltipContent>
                </Tooltip>

                <div className='h-full w-[2px] bg-gray-800 mx-3'></div>
                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<ThickArrowRightIcon />}
                      onClick={playNextBlankInstance()}
                      tooltip='Play next blank'
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play next blank</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<ThickArrowLeftIcon />}
                      onClick={playPreviousBlankInstance()}
                      tooltip='Play previous blank'
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play previous blank</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<TextAlignLeftIcon />}
                      tooltip='Play audio from the start of current paragraph'
                      onClick={playCurrentParagraphInstance()}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play audio from the start of current paragraph</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <Dialog>
                      <DialogTrigger asChild>
                        <PlayerButton
                          icon={<TimerIcon />}
                          onClick={setSelectionHandler}
                          tooltip='Adjust timestamps'
                        />
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adjust Timestamps</DialogTitle>
                          <DialogDescription>
                            Please enter the seconds to adjust the timetamps by
                          </DialogDescription>
                        </DialogHeader>
                        <Input
                          type='number'
                          placeholder='Enter seconds'
                          value={adjustTimestampsBy}
                          onChange={(e) =>
                            setAdjustTimestampsBy(e.target.value)
                          }
                        />
                        <DialogClose asChild>
                          <Button onClick={handleAdjustTimestamps}>
                            Adjust
                          </Button>
                        </DialogClose>
                      </DialogContent>
                    </Dialog>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust timestamps</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<ZoomInIcon />}
                      tooltip='Increase font size'
                      onClick={increaseFontSize}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Increase font size</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<ZoomOutIcon />}
                      tooltip='Decrease font size'
                      onClick={decreaseFontSize}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Decrease font size</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<ClockIcon />}
                      tooltip='Insert timestamps'
                      onClick={insertTimestampBlankAtCursorPositionInstance}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Insert Timestamps</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <PlayerButton
                      icon={<MagnifyingGlassIcon />}
                      tooltip='Find and replace'
                      onClick={toggleFindAndReplace}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Insert Timestamps</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
            </div>

            <div className='flex gap-2'>
              <Dialog>
                <DropdownMenu>
                  <DropdownMenuTrigger className='flex border border-gray-200 px-3 rounded-3xl items-center ml-3 h-10 shadow-none hover:bg-accent transition-colors'>
                    <div className='flex items-center justify-center mr-2'>
                      Options
                    </div>
                    <CaretDownIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => setIsShortcutsReferenceModalOpen(true)}
                    >
                      Shortcuts Reference
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsConfigureShortcutsModalOpen(true)}
                    >
                      Configure Shortcuts
                    </DropdownMenuItem>
                    {session?.user?.role !== 'CUSTOMER' && (
                      <DropdownMenuItem onClick={toggleRevertTranscript}>
                        Revert Transcript
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={toggleVideo}>
                      Toggle Video
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleNotes}>
                      Notes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleSpeakerName}>
                      Speaker Names
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={downloadMP3.bind(null, orderDetails)}
                    >
                      Download MP3
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={requestExtension}>
                      Request Extension
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={requestExtension}>
                      Request Extension
                    </DropdownMenuItem>
                    {session?.user?.role !== 'CUSTOMER' && (
                      <DropdownMenuItem
                        onClick={() => setReportModalOpen(true)}
                      >
                        Report
                      </DropdownMenuItem>
                    )}
                    {session?.user?.role !== 'CUSTOMER' && (
                      <DropdownMenuItem
                        onClick={() =>
                          getFrequentTermsHandler(
                            orderDetails?.userId,
                            setButtonLoading,
                            setFrequentTermsData,
                            setFrequentTermsModalOpen
                          )
                        }
                      >
                        Frequent Terms
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={toggleAutoCapitalize}>
                      {autoCapitalize ? 'Disable' : 'Enable'} Auto Capitalize
                    </DropdownMenuItem>
                    {session?.user?.role === 'CUSTOMER' && (
                      <DropdownMenuItem
                        onClick={() => setIsFormattingOptionsModalOpen(true)}
                      >
                        Formatting Options
                      </DropdownMenuItem>
                    )}
                    <DialogTrigger asChild>
                      {/* <DropdownMenuItem>Change Editor Mode</DropdownMenuItem> */}
                    </DialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className='mb-5'>
                      Change Editor Mode
                    </DialogTitle>
                    <div>
                      <RadioGroup
                        defaultValue={editorMode}
                        onValueChange={setNewEditorMode}
                        className='flex gap-10 mb-5'
                      >
                        {editorModeOptions.map((option, index) => (
                          <div
                            className='flex items-center space-x-2'
                            key={index}
                          >
                            <RadioGroupItem value={option} id={option} />
                            <Label htmlFor={option}>{option}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                    <DialogClose asChild>
                      <Button onClick={() => getEditorMode(newEditorMode)}>
                        Confirm
                      </Button>
                    </DialogClose>
                  </DialogHeader>
                </DialogContent>
              </Dialog>

              {step !== 'QC' && (
                <>
                  {editorMode === 'Manual' && (
                    <>
                      {orderDetails.status === 'FINALIZER_ASSIGNED' ||
                        orderDetails.status === 'PRE_DELIVERED' ? (
                        <Button
                          onClick={() =>
                            downloadBlankDocx({
                              orderDetails,
                              downloadableType: 'markings',
                              setButtonLoading,
                            })
                          }
                        >
                          Download DOCX
                        </Button>
                      ) : (
                        <DownloadDocxDialog
                          orderDetails={orderDetails}
                          downloadableType={downloadableType}
                          setButtonLoading={setButtonLoading}
                          buttonLoading={buttonLoading}
                          setDownloadableType={setDownloadableType}
                        />
                      )}

                      <UploadDocxDialog
                        orderDetails={orderDetails}
                        setButtonLoading={setButtonLoading}
                        buttonLoading={buttonLoading}
                        setFileToUpload={setFileToUpload}
                        fileToUpload={fileToUpload}
                        session={session}
                      />
                    </>
                  )}
                </>
              )}

              {editorMode === 'Editor' && step !== 'QC' && (
                <Button
                  variant='outline'
                  className='border border-[#6442ED] text-[#6442ED] hover:text-[#6442ede6]'
                  onClick={() =>
                    regenDocx(
                      orderDetails.fileId,
                      orderDetails.orderId,
                      setButtonLoading,
                      setRegenCount,
                      setPdfUrl
                    )
                  }
                  disabled={buttonLoading.regenDocx}
                >
                  {' '}
                  {buttonLoading.regenDocx && (
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  )}{' '}
                  Regenerate Document
                </Button>
              )}

              {session?.user?.role === 'CUSTOMER' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant='outline'>Re-Review</Button>
                  </DialogTrigger>
                  <DialogContent className='w-2/5'>
                    <DialogHeader>
                      <DialogTitle>Order Re-review</DialogTitle>
                      <DialogDescription>
                        Please enter specific instructions for the re-review, if
                        any
                      </DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4 py-4'>
                      <Textarea
                        onChange={(e) => setReReviewComment(e.target.value)}
                        placeholder='Enter instructions...'
                        className='min-h-[100px] resize-none'
                      />
                    </div>
                    <div className='flex justify-end gap-3'>
                      <DialogClose asChild>
                        <Button variant='outline'>Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleReReview} type='submit'>
                        Order
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <div className='flex items-center'>
                {(step === 'QC' || session?.user?.role === 'OM') && (
                  <Button
                    onClick={() =>
                      handleSave({
                        getEditorText,
                        orderDetails,
                        notes,
                        cfd,
                        setButtonLoading,
                        lines,
                        playerEvents,
                      })
                    }
                    disabled={buttonLoading.save}
                    className='w-24 mr-2'
                    variant='outline'
                  >
                    {' '}
                    {buttonLoading.save && (
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    )}{' '}
                    Save
                  </Button>
                )}

                {!['CUSTOMER', 'OM', 'ADMIN'].includes(
                  session?.user?.email ?? ''
                ) && (
                    <Button onClick={() => setSubmitting(true)} className='w-24'>
                      Submit
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ShortcutsReferenceDialog
        isShortcutsReferenceModalOpen={isShortcutsReferenceModalOpen}
        setIsShortcutsReferenceModalOpen={setIsShortcutsReferenceModalOpen}
        shortcuts={shortcuts}
        setShortcuts={setShortcuts}
      />
      <ConfigureShortcutsDialog
        isConfigureShortcutsModalOpen={isConfigureShortcutsModalOpen}
        setIsConfigureShortcutsModalOpen={setIsConfigureShortcutsModalOpen}
        shortcuts={shortcuts}
        updateShortcut={updateShortcut}
      />

      <Dialog
        open={isSpeakerNameModalOpen}
        onOpenChange={(value) => {
          setIsSpeakerNameModalOpen(value)
          if (!value) {
            setSubmitting(false)
          }
        }}
      >
        <DialogContent className='max-w-4xl w-2/4'>
          <DialogHeader>
            <DialogTitle>Speaker Names</DialogTitle>
            <DialogDescription>
              Please enter the speaker names below
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            {speakerName &&
              Object.entries(speakerName).map(([key, value], index) => (
                <div
                  key={key}
                  className='flex items-center justify-start space-x-2'
                >
                  <Label htmlFor={key}>{key}:</Label>
                  <Input
                    id={key}
                    value={value}
                    onChange={(e) => handleSpeakerNameChange(e, key)}
                    className='w-4/5'
                  />
                  {index === Object.entries(speakerName).length - 1 && (
                    <button
                      onClick={addSpeakerName}
                      title='Add Speaker'
                      className='ml-2 text-red-500 font-bold'
                    >
                      <PlusIcon />
                    </button>
                  )}
                </div>
              ))}
          </div>

          <div className='space-y-4 mt-4'>
            <p className='text-sm text-gray-500'>
              Please follow the rules below to determine the speaker name, in
              order:
            </p>
            <ol className='list-decimal list-inside text-sm text-gray-500 space-y-1'>
              <li>
                The name as spoken in the audio if the customer instruction is
                present.
              </li>
              <li>The name as mentioned in the customer instructions.</li>
              <li>
                If the customer instructions (CI) explicitly stated that we
                should use the names they listed in the CI instead of the names
                mentioned in the audio, then that CI should be followed.
              </li>
              <li>
                Leave blank otherwise. Do <strong>NOT</strong> use
                Interviewer/Interviewee or any other format unless specified
                explicitly by the customer.
              </li>
            </ol>
            <p className='text-sm font-semibold'>Customer Instructions:</p>
            <p className='text-sm text-gray-500 italic'>
              {/* Add actual customer instructions here if available */}
              No specific instructions provided.
            </p>
          </div>

          <div className='mt-6 flex justify-between'>
            <DialogClose asChild>
              <Button variant='outline'>Close</Button>
            </DialogClose>
            <Button onClick={updateSpeakerName}>Update</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={revertTranscriptOpen}
        onOpenChange={setRevertTranscriptOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert Transcript</DialogTitle>
            <DialogDescription>
              Please confirm that the transcript has to be reverted to the
              original version.
            </DialogDescription>
            <div className='h-2'></div>
            <div className='flex justify-center items-center text-center text-red-500'>
              All edits made will be discarded. This action is irreversible and
              cannot be un-done. If you have made any changes, then we recommend
              that you save the current version by copy pasting it into a new
              document before reverting.
            </div>
            <div className='h-2' />
            <div className='flex justify-end'>
              <Button
                className='mr-2'
                variant='destructive'
                onClick={revertTranscript}
              >
                Revert
              </Button>
              <Button
                variant='outline'
                onClick={() => setRevertTranscriptOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isFormattingOptionsModalOpen}
        onOpenChange={setIsFormattingOptionsModalOpen}
      >
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Formatting Options</DialogTitle>
            <DialogDescription className='text-center text-red-500'>
              These options discard all changes made and reverts the transcript
              to the delivered version. Please set these options before making
              any edits.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='time-coding'
                checked={formattingOptions.timeCoding}
                onCheckedChange={(checked) =>
                  setFormattingOptions((prev) => ({
                    ...prev,
                    timeCoding: checked as boolean,
                  }))
                }
              />
              <Label htmlFor='time-coding'>Time-coding</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='speaker-tracking'
                checked={formattingOptions.speakerTracking}
                onCheckedChange={(checked) =>
                  setFormattingOptions((prev) => ({
                    ...prev,
                    speakerTracking: checked as boolean,
                  }))
                }
              />
              <Label htmlFor='speaker-tracking'>Speaker Tracking</Label>
            </div>
            <RadioGroup
              value={formattingOptions.nameFormat}
              onValueChange={(value) =>
                setFormattingOptions((prev) => ({ ...prev, nameFormat: value }))
              }
              className='pl-6 space-y-2'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='initials' id='initials' />
                <Label htmlFor='initials'>Initials</Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='full-names' id='full-names' />
                <Label htmlFor='full-names'>Full Names</Label>
              </div>
            </RadioGroup>
            <div className='space-y-2'>
              <Label htmlFor='template'>Template</Label>
              <Select
                value={currentTemplate}
                onValueChange={(value) => setCurrentTemplate(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select a template' />
                </SelectTrigger>
                <SelectContent>
                  {allPublicTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsFormattingOptionsModalOpen(false)}>
              Close
            </Button>
            <Button type='submit' onClick={handleFormattingOptionChange}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className={` ${!videoPlayerOpen ? 'hidden' : ''
          } fixed bg-white z-[999] overflow-hidden rounded-lg shadow-lg border aspect-video bg-transparent`}
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
          width: '500px',
          resize: 'horizontal',
        }}
      >
        <div className='relative w-full h-full'>
          <video
            ref={videoRef}
            src={`/api/editor/get-video/${orderDetails.fileId}`}
            className='w-full h-full'
            controls={false}
            onMouseDown={handleDragChange}
          ></video>
          <button
            onClick={() => setVideoPlayerOpen(false)}
            className='absolute top-0 right-0 cursor-pointer bg-gray-100 p-2 rounded-lg mr-2 mt-2'
            style={{ zIndex: 1 }}
          >
            <Cross1Icon />
          </button>
        </div>
      </div>

      <ReportDialog
        reportModalOpen={reportModalOpen}
        setReportModalOpen={setReportModalOpen}
        reportDetails={reportDetails}
        setReportDetails={setReportDetails}
        orderDetails={orderDetails}
        buttonLoading={buttonLoading}
        setButtonLoading={setButtonLoading}
      />
      <FrequentTermsDialog
        frequentTermsModalOpen={frequentTermsModalOpen}
        setFrequentTermsModalOpen={setFrequentTermsModalOpen}
        frequentTermsData={frequentTermsData}
      />
    </div>
  )
}