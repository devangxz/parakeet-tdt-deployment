'use client'

import {
  ChevronDownIcon,
  Cross1Icon,
  ReloadIcon,
  ArrowUpIcon,
} from '@radix-ui/react-icons'
import { GoogleOAuthProvider } from '@react-oauth/google'
import axios from 'axios'
import { PlusIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { Delta } from 'quill/core'
import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  memo,
} from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import ConfigureShortcutsDialog from './ConfigureShortcutsDialog'
import DownloadDocxDialog from './DownloadDocxDialog'
import { EditorHandle } from './Editor'
import EditorHeatmapDialog from './EditorHeatmapDialog'
import EditorSettingsDialog from './EditorSettingsDialog'
// import FrequentTermsDialog from './FrequentTermsDialog'
import FormattingOptionsDialog from './FormattingOptionsDialog'
import ProcessWithLLMDialog from './ProcessWithLLM'
import ReportDialog from './ReportDialog'
import ShortcutsReferenceDialog from './ShortcutsReferenceDialog'
import UploadDocxDialog from './UploadDocxDialog'
import ReviewTranscriptDialog from '../review-with-gemini'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from '../ui/textarea'
import { CheckAndDownload } from '@/app/(dashboard)/files/delivered/components/check-download'
import { fileCacheTokenAction } from '@/app/actions/auth/file-cache-token'
import { getSpeakerNamesAction } from '@/app/actions/editor/get-speaker-names'
import { requestReReviewAction } from '@/app/actions/editor/re-review'
import { requestExtensionAction } from '@/app/actions/editor/request-extension'
import { updateSpeakerNameAction } from '@/app/actions/editor/update-speaker-name'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { getTextFile } from '@/app/actions/get-text-file'
import { getCustomFormatFilesSignedUrl } from '@/app/actions/order/custom-format-files-signed-url'
import { getFileDocxSignedUrl } from '@/app/actions/order/file-docx-signed-url'
import { getFileTxtSignedUrl } from '@/app/actions/order/file-txt-signed-url'
import { OrderDetails } from '@/app/editor/[fileId]/page'
import TranscriberProfile from '@/app/transcribe/components/transcriberProfiles'
import 'rc-slider/assets/index.css'
import RestoreVersionDialog from '@/components/editor/RestoreVersionDialog'
import Profile from '@/components/navbar/profile'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FILE_CACHE_URL, COMMON_ABBREVIATIONS } from '@/constants'
import { AlignmentType, EditorSettings } from '@/types/editor'
import DefaultShortcuts, {
  getAllShortcuts,
  setShortcut,
  ShortcutControls,
  useShortcuts,
  defaultShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  autoCapitalizeSentences,
  CTMType,
  downloadMP3,
  getFormattedContent,
  // getFrequentTermsHandler,
  handleSave,
  navigateAndPlayBlanks,
  playCurrentParagraphTimestamp,
  regenDocx,
} from '@/utils/editorUtils'

interface TopbarProps {
  quillRef: React.RefObject<ReactQuill> | undefined
  editorModeOptions: string[]
  getEditorMode: (editorMode: string) => void
  editorMode: string
  notes: string
  orderDetails: OrderDetails
  submitting: boolean
  setIsSubmitModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
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
  }
  listenCount: number[]
  editedSegments: Set<number>
  editorSettings: EditorSettings
  onSettingsChange: (settings: EditorSettings) => void
  waveformUrl: string
  audioDuration: number
  autoCapitalize: boolean
  onAutoCapitalizeChange: (value: boolean) => void
  transcript: string
  ctms: CTMType[]
  editorRef: React.Ref<EditorHandle>
  step: string
  cfd: string
}

export default memo(function Topbar({
  quillRef,
  editorModeOptions,
  getEditorMode,
  editorMode,
  notes,
  orderDetails,
  submitting,
  setIsSubmitModalOpen,
  setSubmitting,
  setPdfUrl,
  setRegenCount,
  setFileToUpload,
  fileToUpload,
  listenCount,
  editedSegments,
  editorSettings,
  onSettingsChange,
  waveformUrl,
  audioDuration,
  autoCapitalize,
  onAutoCapitalizeChange,
  transcript,
  ctms,
  editorRef,
  step,
  cfd,
}: TopbarProps) {
  const audioPlayer = useRef<HTMLAudioElement>(null)
  const [newEditorMode, setNewEditorMode] = useState<string>('')
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
  const autoCapitalizeRef = useRef(autoCapitalize)
  const previousEditorContentRef = useRef('')
  const [isShortcutsReferenceModalOpen, setIsShortcutsReferenceModalOpen] =
    useState(false)
  const [isConfigureShortcutsModalOpen, setIsConfigureShortcutsModalOpen] =
    useState(false)
  const { data: session } = useSession()
  const [isFormattingOptionsModalOpen, setIsFormattingOptionsModalOpen] =
    useState(false)
  const [isReReviewModalOpen, setIsReReviewModalOpen] = useState(false)
  const [toggleCheckAndDownload, setToggleCheckAndDownload] = useState(false)
  const [isCheckAndDownloadLoading, setIsCheckAndDownloadLoading] =
    useState(false)
  const [signedUrls, setSignedUrls] = useState({
    txtSignedUrl: '',
    cfDocxSignedUrl: '',
  })
  const [customFormatFilesSignedUrls, setCustomFormatFilesSignedUrls] =
    useState<
      {
        signedUrl: string
        filename: string
        extension: string
      }[]
    >([])
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportDetails, setReportDetails] = useState({
    reportOption: '',
    reportComment: '',
  })
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [processWithLLMModalOpen, setProcessWithLLMModalOpen] = useState(false)
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
  // const [frequentTermsModalOpen, setFrequentTermsModalOpen] = useState(false)
  // const [frequentTermsData, setFrequentTermsData] = useState({
  //   autoGenerated: '',
  //   edited: '',
  // })
  const [downloadableType, setDownloadableType] = useState('no-marking')
  const [asrFileUrl, setAsrFileUrl] = useState('')
  const [qcFileUrl, setQcFileUrl] = useState('')
  const [LLMFileUrl, setLLMFileUrl] = useState('')
  const [reReviewComment, setReReviewComment] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [timeoutCount, setTimeoutCount] = useState('')
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false)
  const [isRestoreVersionModalOpen, setIsRestoreVersionModalOpen] =
    useState(false)

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

  const updateTranscript = (
    quillRef: React.RefObject<ReactQuill> | undefined,
    content: string
  ) => {
    if (!quillRef?.current) return
    const quill = quillRef.current.getEditor()
    const formattedOps = getFormattedContent(content)
    const updateDelta = new Delta().delete(quill.getText().length)
    formattedOps.forEach((op) => {
      if (op.insert !== undefined) {
        updateDelta.insert(op.insert, op.attributes || {})
      }
    })
    quill.updateContents(updateDelta, 'user')
  }

  useEffect(() => {
    setShortcuts(
      Object.entries({
        ...defaultShortcuts,
        ...editorSettings.shortcuts,
      }).map(([key, shortcut]) => ({
        key,
        shortcut,
      }))
    )
  }, [editorSettings.shortcuts])

  const updateShortcut = async (
    action: keyof DefaultShortcuts,
    newShortcut: string
  ) => {
    await setShortcut(action, newShortcut)
    const updatedShortcuts = await getAllShortcuts()
    setShortcuts(updatedShortcuts)
  }

  useEffect(() => {
    autoCapitalizeRef.current = autoCapitalize
  }, [autoCapitalize])

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

  useEffect(() => {
    const syncVideoWithAudio = () => {
      if (!audioPlayer || !audioPlayer.current || !videoRef.current) return
      const player = audioPlayer.current
      videoRef.current.volume = 0

      const handleAudioPlay = () => videoRef.current?.play()
      const handleAudioPause = () => videoRef.current?.pause()

      player.addEventListener('play', handleAudioPlay)
      player.addEventListener('pause', handleAudioPause)

      player.addEventListener('seeking', () => {
        if (videoRef.current) videoRef.current.currentTime = player.currentTime
      })

      return () => {
        player.removeEventListener('play', handleAudioPlay)
        player.removeEventListener('pause', handleAudioPause)
      }
    }

    if (videoPlayerOpen) {
      const cleanup = syncVideoWithAudio()
      const interval = setInterval(() => {
        if (!audioPlayer || !audioPlayer.current || !videoRef.current) return
        if (videoRef.current.currentTime !== audioPlayer.current.currentTime) {
          videoRef.current.currentTime = audioPlayer.current.currentTime
        }
      }, 1000)

      return () => {
        cleanup?.()
        clearInterval(interval)
      }
    }
  }, [audioPlayer, videoRef, videoPlayerOpen])

  const toggleVideo = async () => {
    try {
      if (!videoUrl) {
        const { success, signedUrl } = await getSignedUrlAction(
          `${orderDetails.fileId}.mp4`,
          3600
        )
        if (success && signedUrl) {
          setVideoUrl(signedUrl)
        } else {
          throw new Error('Failed to fetch video file')
        }
      }
      setVideoPlayerOpen(!videoPlayerOpen)
    } catch (error) {
      toast.error('Failed to fetch video file')
    }
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

      const shouldCapitalize = (index: number): boolean => {
        if (index === 0) return true

        const textBefore = newText.slice(0, index)

        // Check for ! or ? first - always capitalize after these
        if (/[!?]\s$/.test(textBefore)) return true

        // Check for period - only then check abbreviations
        if (/\.\s$/.test(textBefore)) {
          const word = textBefore
            .trim()
            .split(' ')
            .pop()
            ?.slice(0, -1)
            .toLowerCase()
          return !COMMON_ABBREVIATIONS.has(word || '')
        }

        return false
      }

      const capitalizeChar = (index: number): void => {
        const char = newText[index]
        if (/^[a-zA-Z]$/.test(char) && char !== char.toUpperCase()) {
          quill.deleteText(index, 1, 'user')
          quill.insertText(index, char.toUpperCase(), quill.getFormat(), 'user')
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
    if (typeof document === 'undefined') return // Ensure code runs only in the browser

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
    onAutoCapitalizeChange(!autoCapitalize)
  }

  const toggleRevertTranscript = () => {
    setRevertTranscriptOpen(!revertTranscriptOpen)
  }

  function checkSpeakerOrder(speakers: Record<string, string>): boolean {
    const expectedOrder = Object.keys(speakers).sort((a, b) => {
      const numA = parseInt(a.replace('S', ''))
      const numB = parseInt(b.replace('S', ''))
      return numA - numB
    })

    return Object.keys(speakers).every(
      (key, index) => key === expectedOrder[index]
    )
  }

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
    let type = 'QC'
    if (orderDetails.status === 'REVIEWER_ASSIGNED') {
      type = 'CF_REV'
    } else if (orderDetails.status === 'FINALIZER_ASSIGNED') {
      type = 'CF_FINALIZER'
    }

    try {
      const tokenRes = await fileCacheTokenAction()
      await axios.post(
        `${FILE_CACHE_URL}/revert-transcript`,
        {
          fileId: orderDetails.fileId,
          type,
        },
        {
          headers: {
            Authorization: `Bearer ${tokenRes.token}`,
          },
        }
      )
      toast.success('Transcript reverted successfully')
      localStorage.removeItem('transcript')
      window.location.reload()
      return
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to revert transcript')
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

  useEffect(() => {
    let timer: NodeJS.Timeout

    const updateRemainingTime = () => {
      const remainingSeconds = parseInt(orderDetails.remainingTime)
      if (remainingSeconds > 0) {
        const hours = Math.floor(remainingSeconds / 3600)
        const minutes = Math.floor((remainingSeconds % 3600) / 60)
        const seconds = remainingSeconds % 60

        const formattedTime = [
          hours.toString().padStart(2, '0'),
          minutes.toString().padStart(2, '0'),
          seconds.toString().padStart(2, '0'),
        ].join(':')

        setTimeoutCount(formattedTime)
        orderDetails.remainingTime = (remainingSeconds - 1).toString()

        timer = setTimeout(updateRemainingTime, 1000)
      } else {
        setTimeoutCount('00:00:00')
      }
    }

    if (orderDetails.status === 'QC_ASSIGNED') {
      updateRemainingTime()
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [orderDetails])

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

  const handleCheckAndDownload = async (fileId: string) => {
    setIsCheckAndDownloadLoading(true)
    try {
      let currentAlignments: AlignmentType[] = []
      if (
        typeof editorRef === 'object' &&
        editorRef !== null &&
        editorRef.current
      ) {
        editorRef.current.triggerAlignmentUpdate()
        currentAlignments = editorRef.current.getAlignments()
      }

      await handleSave(
        {
          getEditorText,
          orderDetails,
          notes,
          cfd,
          setButtonLoading,
          listenCount,
          editedSegments,
          role: session?.user?.role || '',
          currentAlignments,
        },
        false
      )

      const txtRes = await getFileTxtSignedUrl(fileId)
      const docxRes = await getFileDocxSignedUrl(
        fileId,
        'CUSTOM_FORMATTING_DOC'
      )
      setSignedUrls({
        txtSignedUrl: txtRes.signedUrl || '',
        cfDocxSignedUrl: docxRes ? docxRes.signedUrl || '' : '',
      })
      const customFormatRes = await getCustomFormatFilesSignedUrl(fileId)
      if (customFormatRes.success) {
        setCustomFormatFilesSignedUrls(customFormatRes.signedUrls || [])
      }

      setIsCheckAndDownloadLoading(false)
      setToggleCheckAndDownload(true)
    } catch (error) {
      toast.error('Error downloading files')
      setIsCheckAndDownloadLoading(false)
    } finally {
      setIsCheckAndDownloadLoading(false)
    }
  }

  const handleDropdownMenuOpenChange = async (open: boolean) => {
    if (open) {
      const asrFileUrl = await getTextFile(orderDetails.fileId, 'ASR')
      setAsrFileUrl(asrFileUrl?.signedUrl || '')
      const qcFileUrl = await getTextFile(orderDetails.fileId, 'QC')
      setQcFileUrl(qcFileUrl?.signedUrl || '')
      const LLMFileUrl = await getTextFile(orderDetails.fileId, 'LLM')
      setLLMFileUrl(LLMFileUrl?.signedUrl || '')
    }
  }

  const handleSwapSpeakers = (currentIndex: number) => {
    if (!speakerName || currentIndex === 0) return

    const entries = Object.entries(speakerName)
    const currentKey = entries[currentIndex][0]
    const previousKey = entries[currentIndex - 1][0]

    setSpeakerName((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [currentKey]: prev[previousKey],
        [previousKey]: prev[currentKey],
      }
    })
  }

  return (
    <div className='bg-background border border-customBorder rounded-md p-2'>
      <div className='flex items-center justify-between'>
        <p className='font-semibold'>{orderDetails.filename}</p>

        {orderDetails.status === 'QC_ASSIGNED' && (
          <span
            className={`text-red-600 absolute left-1/2 transform -translate-x-1/2 ${
              orderDetails.remainingTime === '0' ? 'animate-pulse' : ''
            }`}
          >
            {timeoutCount}
          </span>
        )}

        <div className='flex gap-2'>
          {step !== 'QC' && (
            <>
              {editorMode === 'Manual' && (
                <>
                  {!(
                    orderDetails.orderType === 'FORMATTING' &&
                    orderDetails.status === 'REVIEWER_ASSIGNED'
                  ) && (
                    <DownloadDocxDialog
                      orderDetails={orderDetails}
                      downloadableType={downloadableType}
                      setDownloadableType={setDownloadableType}
                      quillRef={quillRef}
                      transcript={transcript}
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
              className='flex items-center border-primary border-2 justify-center px-2 py-1 text-sm font-medium text-primary rounded-[32px] cursor-pointer transition-all duration-200 hover:opacity-90'
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

          <div className='flex'>
            {['CUSTOMER'].includes(session?.user?.role ?? '') ? (
              <Button
                disabled={isCheckAndDownloadLoading}
                onClick={() => handleCheckAndDownload(orderDetails.fileId)}
                className='format-button border-r-[1.5px] border-white/70'
              >
                {isCheckAndDownloadLoading ? (
                  <>
                    Please wait
                    <ReloadIcon className='ml-2 h-4 w-4 animate-spin' />
                  </>
                ) : (
                  'Download'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setSubmitting(true)}
                className='format-button border-r-[1.5px] border-white/70'
              >
                Submit
              </Button>
            )}

            <DropdownMenu
              modal={false}
              onOpenChange={handleDropdownMenuOpenChange}
            >
              <DropdownMenuTrigger className='focus-visible:ring-0 outline-none'>
                <Button className='px-2 format-icon-button focus-visible:ring-0 outline-none'>
                  <span className='sr-only'>Open menu</span>
                  <ChevronDownIcon className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-30'>
                <DropdownMenuItem
                  onClick={() => {
                    autoCapitalizeSentences(quillRef, autoCapitalize)
                    handleSave({
                      getEditorText,
                      orderDetails,
                      notes,
                      cfd,
                      setButtonLoading,
                      listenCount,
                      editedSegments,
                      role: session?.user?.role || '',
                    })
                  }}
                >
                  Save
                </DropdownMenuItem>
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
                <DropdownMenuItem onClick={toggleSpeakerName}>
                  Speaker Names
                </DropdownMenuItem>
                {session?.user?.role !== 'CUSTOMER' && (
                  <DropdownMenuItem
                    onClick={downloadMP3.bind(null, orderDetails)}
                  >
                    Download MP3
                  </DropdownMenuItem>
                )}
                {!['CUSTOMER', 'OM', 'ADMIN'].includes(
                  session?.user?.role || ''
                ) && (
                  <DropdownMenuItem onClick={requestExtension}>
                    Request Extension
                  </DropdownMenuItem>
                )}
                {session?.user?.role !== 'CUSTOMER' && (
                  <DropdownMenuItem onClick={() => setReportModalOpen(true)}>
                    Report
                  </DropdownMenuItem>
                )}
                {/* {session?.user?.role !== 'CUSTOMER' && (
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
                )} */}
                <DropdownMenuItem onClick={() => setReviewModalOpen(true)}>
                  Review with Gemini
                </DropdownMenuItem>
                {orderDetails.orderType === 'TRANSCRIPTION_FORMATTING' && (
                  <DropdownMenuItem
                    onClick={() => setProcessWithLLMModalOpen(true)}
                  >
                    Marking with LLM
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
                {session?.user?.role === 'CUSTOMER' && (
                  <DropdownMenuItem
                    onClick={() => setIsReReviewModalOpen(true)}
                  >
                    Re-Review
                  </DropdownMenuItem>
                )}
                {orderDetails.status === 'QC_ASSIGNED' && (
                  <DropdownMenuItem asChild>
                    <a href={asrFileUrl} target='_blank'>
                      Download ASR text
                    </a>
                  </DropdownMenuItem>
                )}
                {(orderDetails.status === 'REVIEWER_ASSIGNED' ||
                  orderDetails.status === 'FINALIZER_ASSIGNED') && (
                  <DropdownMenuItem asChild>
                    <a href={qcFileUrl} target='_blank'>
                      Download QC text
                    </a>
                  </DropdownMenuItem>
                )}
                {(orderDetails.status === 'REVIEWER_ASSIGNED' ||
                  orderDetails.status === 'FINALIZER_ASSIGNED') && (
                  <DropdownMenuItem asChild>
                    <a href={LLMFileUrl} target='_blank'>
                      Download LLM text
                    </a>
                  </DropdownMenuItem>
                )}
                {session?.user?.role !== 'CUSTOMER' && (
                  <DropdownMenuItem onClick={() => setIsHeatmapModalOpen(true)}>
                    Waveform Heatmap
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setIsRestoreVersionModalOpen(true)}
                >
                  Restore Version
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsSettingsModalOpen(true)}>
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className='mb-5'>Change Editor Mode</DialogTitle>
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
          </div>
          {session?.user?.role === 'CUSTOMER' ||
          session?.user?.role === 'ADMIN' ? (
            <Profile />
          ) : (
            <TranscriberProfile />
          )}
          <ThemeSwitcher />
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

          {speakerName && !checkSpeakerOrder(speakerName) && (
            <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md'>
              <p className='text-yellow-800 text-sm'>
                Warning: Speaker labels in the transcript are not in sequential
                order. This may cause confusion. Please ensure the transcript
                follows the correct order before proceeding (S1, S2, S3...).
              </p>
            </div>
          )}

          <div className='space-y-4'>
            {speakerName &&
              Object.entries(speakerName).map(([key, value], index) => (
                <div
                  key={key}
                  className='flex items-center justify-start space-x-2'
                >
                  <Label htmlFor={key}>{key}:</Label>
                  <div className='relative flex items-center w-4/5'>
                    <Input
                      disabled={!checkSpeakerOrder(speakerName)}
                      id={key}
                      value={value}
                      onChange={(e) => handleSpeakerNameChange(e, key)}
                      className='w-full'
                    />
                    {index > 0 && (
                      <button
                        onClick={() => handleSwapSpeakers(index)}
                        title='Swap with previous speaker'
                        className='absolute right-2 p-1 hover:bg-gray-100 rounded-full transition-colors'
                        type='button'
                      >
                        <ArrowUpIcon className='h-4 w-4 text-muted-foreground' />
                      </button>
                    )}
                  </div>
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
            <p className='text-sm text-muted-foreground'>
              Please follow the rules below to determine the speaker name, in
              order:
            </p>
            <ol className='list-decimal list-inside text-sm text-muted-foreground space-y-1'>
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
            <p className='text-sm text-muted-foreground italic'>
              {/* Add actual customer instructions here if available */}
              No specific instructions provided.
            </p>
          </div>

          <div className='mt-6 flex justify-between'>
            <DialogClose asChild>
              <Button variant='outline'>Close</Button>
            </DialogClose>
            <Button
              disabled={!checkSpeakerOrder(speakerName || {})}
              onClick={updateSpeakerName}
            >
              Update
            </Button>
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
      <FormattingOptionsDialog
        isFormattingOptionsModalOpen={isFormattingOptionsModalOpen}
        setIsFormattingOptionsModalOpen={setIsFormattingOptionsModalOpen}
        orderId={Number(orderDetails.orderId)}
        fileId={orderDetails.fileId}
        quillRef={quillRef}
        updateQuill={updateTranscript}
      />
      <div
        className={` ${
          !videoPlayerOpen ? 'hidden' : ''
        } fixed z-[999] overflow-hidden rounded-lg shadow-lg border aspect-video bg-background`}
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
            src={`${videoUrl}`}
            className='w-full h-full'
            controls={false}
            onMouseDown={handleDragChange}
          ></video>
          <button
            onClick={() => setVideoPlayerOpen(false)}
            className='absolute top-0 right-0 cursor-pointer bg-secondary p-2 rounded-lg mr-2 mt-2'
            style={{ zIndex: 1 }}
          >
            <Cross1Icon />
          </button>
        </div>
      </div>

      <Dialog open={isReReviewModalOpen} onOpenChange={setIsReReviewModalOpen}>
        <DialogContent className='w-2/5'>
          <DialogHeader>
            <DialogTitle>Order Re-review</DialogTitle>
            <DialogDescription>
              Please enter specific instructions for the re-review, if any
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Textarea
              onChange={(e) => setReReviewComment(e.target.value)}
              placeholder='Enter instructions...'
              className='min-h-[100px] resize-none'
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsReReviewModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleReReview} type='submit'>
              Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toggleCheckAndDownload && (
        <GoogleOAuthProvider
          clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}
        >
          <TooltipProvider>
            <CheckAndDownload
              id={orderDetails.fileId || ''}
              orderType={orderDetails.orderType || ''}
              filename={orderDetails.filename || ''}
              toggleCheckAndDownload={toggleCheckAndDownload}
              setToggleCheckAndDownload={setToggleCheckAndDownload}
              txtSignedUrl={signedUrls.txtSignedUrl || ''}
              cfDocxSignedUrl={signedUrls.cfDocxSignedUrl || ''}
              customFormatFilesSignedUrls={customFormatFilesSignedUrls}
              isFromEditor={true}
            />
          </TooltipProvider>
        </GoogleOAuthProvider>
      )}
      {reportModalOpen && (
        <ReportDialog
          reportModalOpen={reportModalOpen}
          setReportModalOpen={setReportModalOpen}
          reportDetails={reportDetails}
          setReportDetails={setReportDetails}
          orderDetails={orderDetails}
          buttonLoading={buttonLoading}
          setButtonLoading={setButtonLoading}
        />
      )}
      {/* review with gemini */}
      {reviewModalOpen && (
        <ReviewTranscriptDialog
          quillRef={quillRef}
          reviewModalOpen={reviewModalOpen}
          setReviewModalOpen={setReviewModalOpen}
          orderDetails={orderDetails}
          setButtonLoading={setButtonLoading}
          buttonLoading={buttonLoading}
          transcript={
            quillRef?.current
              ? quillRef.current.getEditor().getText()
              : transcript
          }
          ctms={ctms}
          updateQuill={updateTranscript}
          role={session?.user?.role || ''}
        />
      )}
      {/* process with llm */}
      {processWithLLMModalOpen && (
        <ProcessWithLLMDialog
          transcript={
            quillRef?.current
              ? quillRef.current.getEditor().getText()
              : transcript
          }
          processWithLLMModalOpen={processWithLLMModalOpen}
          setprocessWithLLMModalOpen={setProcessWithLLMModalOpen}
          quillRef={quillRef}
          orderDetails={orderDetails}
          updateQuill={updateTranscript}
          role={session?.user?.role || ''}
        />
      )}
      {/* <FrequentTermsDialog
        frequentTermsModalOpen={frequentTermsModalOpen}
        setFrequentTermsModalOpen={setFrequentTermsModalOpen}
        frequentTermsData={frequentTermsData}
      /> */}
      <EditorSettingsDialog
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialSettings={editorSettings}
        onSettingsChange={onSettingsChange}
      />
      <EditorHeatmapDialog
        isOpen={isHeatmapModalOpen}
        onClose={() => setIsHeatmapModalOpen(false)}
        waveformUrl={waveformUrl}
        listenCount={listenCount}
        editedSegments={editedSegments}
        duration={audioDuration}
      />
      <RestoreVersionDialog
        isOpen={isRestoreVersionModalOpen}
        onClose={() => setIsRestoreVersionModalOpen(false)}
        fileId={orderDetails.fileId}
        quillRef={quillRef}
        updateQuill={updateTranscript}
      />
    </div>
  )
})
