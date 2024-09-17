'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import { Change, diffWords } from 'diff'
import { Check, FileUp, Pencil } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import WaveSurfer from 'wavesurfer.js'

import AudioPlayer from '@/components/editor/AudioPlayer'
import Header from '@/components/editor/Header'
import SectionSelector from '@/components/editor/SectionSelector'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/editor/Tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RenderPDFDocument } from '@/components/utils'
import { BACKEND_URL, MINIMUM_AUDIO_PLAYBACK_PERCENTAGE } from '@/constants'
import axiosInstance from '@/utils/axios'
import { bindShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import { ConvertedASROutput, generateRandomColor } from '@/utils/editorUtils'
import generateHTML from '@/utils/generateEditorHtml'

type OrderDetails = {
  orderId: string
  filename: string
  orderType: string
  fileId: string
  templateName: string
  orgName: string
  cfd: string
  status: string
  instructions: string
}

type UploadFilesType = {
  files: FileList
  type: string
}

const reportReasonMap = {
  HIGH_ERROR_RATE: 'High Error Rate',
  INCOMPLETE: 'Incomplete',
  INCORRECT_PARAGRAPH_BREAKS: 'Incorrect Paragraph Breaks',
  DOES_NOT_MATCH_AUDIO: 'Does Not Match Audio',
  HIGH_DIFFICULTY: 'High Difficulty',
  NETWORK_ERROR: 'Network Error',
  NO_SPOKEN_AUDIO: 'No Spoken Audio',
  GUIDELINE_VIOLATIONS: 'Guideline Violations',
  ONLY_BACKGROUND_CONVERSATION: 'Only Background Conversation',
  ONLY_MUSIC: 'Only Music',
  OTHER: 'Other',
}

const renderTitleInputs = (
  cfd: string,
  setCfd: React.Dispatch<React.SetStateAction<string>>
) => {
  const customFormattingDetails = JSON.parse(cfd)
  return Object.entries(customFormattingDetails)
    .filter(
      ([key]) =>
        /^(plaintiff|defendant|jurisdiction)_[0-9]+$/.test(key) ||
        [
          'witness_name',
          'date',
          'start_time',
          'end_time',
          'reporter_name',
          'job_number',
        ].includes(key)
    )
    .map(([key, value]) => (
      <div key={key} className='mb-5'>
        <Label htmlFor={key}>{key.replace(/_/g, ' ')}</Label>
        <Input
          id={key}
          placeholder={key.replace(/_/g, ' ')}
          defaultValue={value as string}
          onChange={(e) => {
            const updatedDetails = {
              ...customFormattingDetails,
              [key]: e.target.value,
            }
            setCfd(JSON.stringify(updatedDetails))
          }}
        />
      </div>
    ))
}

const renderCaseDetailsInputs = (
  cfd: string,
  setCfd: React.Dispatch<React.SetStateAction<string>>
) => {
  const customFormattingDetails = JSON.parse(cfd)
  const regexPatterns = [
    /^plaintiff_[0-9]+_law_firm_name_[0-9]+$/,
    /^plaintiff_[0-9]+_law_firm_[0-9]+_address_[0-9]+$/,
    /^plaintiff_[0-9]+_law_firm_[0-9]+_attorney_name_[0-9]+$/,
    /^plaintiff_[0-9]+_law_firm_[0-9]+_attorney_email_[0-9]+$/,
    /^plaintiff_[0-9]+$/,
    /^defendant_[0-9]+_law_firm_name_[0-9]+$/,
    /^defendant_[0-9]+_law_firm_[0-9]+_address_[0-9]+$/,
    /^defendant_[0-9]+_law_firm_[0-9]+_attorney_name_[0-9]+$/,
    /^defendant_[0-9]+_law_firm_[0-9]+_attorney_email_[0-9]+$/,
    /^defendant_[0-9]+$/,
    /^also_present_[0-9]+$/,
  ]

  return Object.entries(customFormattingDetails)
    .filter(([key]) => regexPatterns.some((pattern) => pattern.test(key)))
    .map(([key, value]) => (
      <div key={key} className='mb-5'>
        <Label htmlFor={key}>{key.replace(/_/g, ' ')}</Label>
        <Input
          id={key}
          placeholder={key.replace(/_/g, ' ')}
          defaultValue={value as string}
          onChange={(e) => {
            const updatedDetails = {
              ...customFormattingDetails,
              [key]: e.target.value,
            }
            setCfd(JSON.stringify(updatedDetails))
          }}
        />
      </div>
    ))
}

const renderCertificationInputs = (
  cfd: string,
  setCfd: React.Dispatch<React.SetStateAction<string>>
) => {
  const customFormattingDetails = JSON.parse(cfd)
  const keysToRender = [
    'state',
    'county',
    'month_year',
    'day',
    'witness_name',
    'notary_name',
    'comm_no',
    'comm_exp',
    'reporter_name',
    'date',
  ]

  return Object.entries(customFormattingDetails)
    .filter(([key]) => keysToRender.includes(key))
    .map(([key, value]) => (
      <div key={key} className='mb-5'>
        <Label htmlFor={key}>{key.replace(/_/g, ' ')}</Label>
        <Input
          id={key}
          placeholder={key.replace(/_/g, ' ')}
          defaultValue={value as string}
          onChange={(e) => {
            customFormattingDetails[key] = e.target.value
            setCfd(JSON.stringify(customFormattingDetails))
          }}
        />
      </div>
    ))
}

export type PlayerControls = {
  playPause: () => void
  seekForward: () => void
  seekBackward: () => void
  volumeDown: () => void
  volumeUp: () => void
  increaseSpeed: () => void
  decreaseSpeed: () => void
  playAt75Percent: () => void
  playAt100Percent: () => void
}

const playControls: PlayerControls = {
  playPause: () => { },
  seekForward: () => { },
  seekBackward: () => { },
  volumeDown: () => { },
  volumeUp: () => { },
  increaseSpeed: () => { },
  decreaseSpeed: () => { },
  playAt75Percent: () => { },
  playAt100Percent: () => { },
}

export type ShortcutControls = PlayerControls & {
  searchWordUnderCursor: () => void // Example for extending the type
  correctSpelling: () => void
  insertTimestamps: () => void
  insertSpeakerName: () => void
  playWord: () => void
  nextPage: () => void
  prevPage: () => void
}

const shortcutControlFunctions: ShortcutControls = {
  ...playControls,
  searchWordUnderCursor: () => { },
  correctSpelling: () => { },
  insertTimestamps: () => { },
  insertSpeakerName: () => { },
  playWord: () => { },
  nextPage: () => { },
  prevPage: () => { },
  // You can add more functions here as needed
}

function Editor() {
  const [selectedSection, setSelectedSection] = useState('proceedings')
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    orderId: '',
    filename: '',
    orderType: '',
    fileId: '',
    templateName: '',
    orgName: '',
    cfd: '',
    instructions: '',
    status: '',
  })
  const [cfd, setCfd] = useState('')
  const [transcript, setTranscript] = useState('')
  const [ctms, setCtms] = useState<ConvertedASROutput[]>([])
  const [editorHTML, setEditorHTML] = useState('')
  const [editorHTMLParts, setEditorHTMLParts] = useState<string[]>([])
  const [currentEditorPart, setCurrentEditorPart] = useState(0)
  const [notes, setNotes] = useState('')
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const router = useRouter()
  const [diffOutput, setDiffOutput] = useState<Change[]>([])
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [regenCount, setRegenCount] = useState(0)
  const [initialPDFLoaded, setInitialPDFLoaded] = useState(false)
  const [reportDetails, setReportDetails] = useState({
    reportOption: '',
    reportComment: '',
  })
  const [pdfUrl, setPdfUrl] = useState('')
  const [editorMode, setEditorMode] = useState('')
  const [downloadableType, setDownloadableType] = useState('marking')
  const [editorModeOptions] = useState<string[]>([])
  const [fileToUpload, setFileToUpload] = useState<{
    renamedFile: File | null
    originalFile: File | null
    isUploaded?: boolean
  }>({ renamedFile: null, originalFile: null })
  const { data: session, status } = useSession()
  const [speakers, setSpeakers] = useState<{ [key: string]: string }>({})
  const [editingSpeaker, setEditingSpeaker] = useState({
    oldName: '',
    newName: '',
  })
  const [disableAudioPlayCheck, setDisableAudioPlayCheck] = useState(false)
  const [shortcutControls, setShortcutControls] = useState<ShortcutControls>(
    shortcutControlFunctions
  )
  const [playerControls, setPlayerControls] =
    useState<PlayerControls>(playControls)
  const [step, setStep] = useState<string>('')
  const [spellcheckModal, setSpellcheckModal] = useState(false)
  const [wordSuggestions, setWordSuggestions] = useState<{
    suggestions: string[]
    node: HTMLElement | null
  }>({
    suggestions: [],
    node: null,
  })
  const [buttonLoading, setButtonLoading] = useState({
    download: false,
    upload: false,
    submit: false,
    save: false,
    report: false,
    regenDocx: false,
    mp3: false,
  })

  const [anchorNodeData, setAnchorNodeData] = useState({
    timeStart: '',
    outerHTML: '',
  })
  const [speakerNameModalOpen, setSpeakerNameModalOpen] = useState(false)
  const [newSpeakerName, setNewSpeakerName] = useState('')

  const convertSecondsToTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secondsLeft = seconds % 60

    return `${hours}:${minutes.toString().padStart(2, '0')}:${secondsLeft
      .toFixed(1)
      .padStart(4, '0')}`
  }
  useEffect(() => {
    const playerFunctions = {
      playPause: () => {
        wavesurfer?.playPause()
      },
      seekForward: () => {
        if (!wavesurfer) return
        const currentTime = wavesurfer.getCurrentTime()
        wavesurfer.seekTo((currentTime + 10) / wavesurfer.getDuration())
      },
      seekBackward: () => {
        if (!wavesurfer) return
        const currentTime = wavesurfer.getCurrentTime()
        wavesurfer.seekTo((currentTime - 10) / wavesurfer.getDuration())
      },
      volumeDown: () => {
        if (!wavesurfer) return
        let newVolume = wavesurfer.getVolume() - 0.1
        if (newVolume < 0) newVolume = 0
        wavesurfer?.setVolume(newVolume)
      },
      volumeUp: () => {
        if (!wavesurfer) return
        let newVolume = wavesurfer.getVolume() + 0.1
        if (newVolume > 1) newVolume = 1
        wavesurfer?.setVolume(newVolume)
      },
      increaseSpeed: () => {
        if (!wavesurfer) return
        const currentRate = wavesurfer.getPlaybackRate()
        wavesurfer.setPlaybackRate(currentRate + 0.5)
      },
      decreaseSpeed: () => {
        if (!wavesurfer) return
        const currentRate = wavesurfer.getPlaybackRate()
        wavesurfer.setPlaybackRate(currentRate - 0.5)
      },
      playAt75Percent: () => {
        if (!wavesurfer) return
        wavesurfer.setPlaybackRate(0.75)
      },
      playAt100Percent: () => {
        if (!wavesurfer) return
        wavesurfer.setPlaybackRate(1)
      },
    }

    setShortcutControls({
      ...playerFunctions,
      searchWordUnderCursor: () => { },
      correctSpelling: () => { },
      insertTimestamps: () => { },
      insertSpeakerName: () => { },
      playWord: () => { },
      nextPage: () => { },
      prevPage: () => { },
    })

    setPlayerControls(playerFunctions)
  }, [wavesurfer])

  useEffect(() => {
    bindShortcuts(shortcutControls)
  }, [shortcutControls])

  useEffect(() => {
    let keysPressed: string[] = []
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.push(event.key)
      if (
        event.ctrlKey &&
        event.shiftKey &&
        keysPressed.includes('Q') &&
        keysPressed.includes('Z') &&
        keysPressed.includes('X')
      ) {
        setDisableAudioPlayCheck(true)
        toast.info('Audio play check disabled')
      }
    }

    const handleKeyUp = () => {
      keysPressed = []
    }

    editorRef?.current?.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.altKey) {
        event.preventDefault()
      }

      if (event.altKey && event.ctrlKey && event.code === 'KeyU') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const startNode = range.startContainer
          const endNode = range.endContainer

          let cap = false
          editorRef?.current?.childNodes.forEach((node) => {
            if (node.firstChild === startNode) {
              cap = true
            }

            if (node.firstChild === endNode) {
              cap = false
            }

            if (cap) {
              if (node.firstChild && node.firstChild.textContent) {
                node.firstChild.textContent =
                  node.firstChild.textContent[0].toUpperCase() +
                  node.firstChild.textContent.slice(1)
              }
            }
          })
        }
      }

      if (event.altKey && event.code === 'KeyS') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const indexNode = range.startContainer

          window.open(
            'https://www.google.com/search?q=' + indexNode.textContent,
            '_blank',
            [
              'titlebar=no',
              'location=no',
              'menubar=no',
              'toolbar=no',
              'status=no',
              'scrollbars=no',
              'resizeable=no',
              'top=0',
              'left=0',
              'height=' + window.screen.availHeight / 2,
              'width=' + window.screen.availWidth / 2,
            ].join(',')
          )
        }
      }

      if (event.ctrlKey && event.code === 'KeyT') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const startNode = selection.anchorNode
          if (startNode) {
            const timeStart = (startNode.parentNode as HTMLElement).dataset
              .timeStart
            const formattedTime = convertSecondsToTimestamp(Number(timeStart))
            startNode.textContent = `${startNode.textContent} [${formattedTime}] ____ `
          }
        }
      }

      if (event.altKey && event.code === 'KeyM') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const startNode = selection.anchorNode
          const element = startNode?.parentNode as HTMLElement
          if (element.classList.contains('misspelled')) {
            const suggestions = JSON.parse(
              element.dataset.wordSuggestions as string
            )
            if (suggestions && suggestions.length) {
              setWordSuggestions({ suggestions, node: element })
              setSpellcheckModal(true)
            }
          }
        }
      }

      if (event.shiftKey && event.key === 'F12') {
        event.preventDefault()
        const selection = window.getSelection()
        const anchorNode = selection?.anchorNode?.parentNode
        if (anchorNode) {
          const startTime = (anchorNode as HTMLElement).dataset.timeStart
          // Capture the anchorNode data immediately in a temporary variable
          const tempAnchorNodeData = {
            timeStart: startTime || '',
            outerHTML: (anchorNode as HTMLElement).outerHTML,
          }
          // Use the temporary variable to set the state
          setAnchorNodeData(tempAnchorNodeData)

          setTimeout(() => {
            setSpeakerNameModalOpen(true)
          }, 100)
        }
      }
    })

    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'BracketLeft' && event.ctrlKey) {
        const newEditorPart =
          currentEditorPart - 1 < 0 ? 0 : currentEditorPart - 1
        setCurrentEditorPart(newEditorPart)
        if (!editorRef.current) return
        const newHTML = editorHTMLParts[newEditorPart].startsWith('<br> <br>')
          ? editorHTMLParts[newEditorPart].replace('<br> <br> ', '')
          : editorHTMLParts[newEditorPart]
        editorRef.current.innerHTML = newHTML
      }

      if (event.code === 'BracketRight' && event.ctrlKey) {
        const newEditorPart =
          currentEditorPart + 1 > editorHTMLParts.length - 1
            ? editorHTMLParts.length - 1
            : currentEditorPart + 1
        setCurrentEditorPart(newEditorPart)
        if (!editorRef.current) return
        const newHTML = editorHTMLParts[newEditorPart].startsWith('<br> <br>')
          ? editorHTMLParts[newEditorPart].replace('<br> <br> ', '')
          : editorHTMLParts[newEditorPart]
        editorRef.current.innerHTML = newHTML
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editorHTMLParts, editorRef, currentEditorPart])

  const insertNewSpeaker = () => {
    if (!newSpeakerName) {
      toast.error('Please enter a speaker name')
      return
    }
    const startTime = anchorNodeData.timeStart
    const formattedTime = convertSecondsToTimestamp(Number(startTime))
    let speakerColor = generateRandomColor()
    while (Object.values(speakers).includes(speakerColor)) {
      speakerColor = generateRandomColor()
    }

    if (speakers[newSpeakerName + ':']) {
      speakerColor = speakers[newSpeakerName + ':']
    }

    setSpeakers((prevSpeakers) => ({
      ...prevSpeakers,
      [newSpeakerName + ':']: speakerColor,
    }))
    const speakerNameHtml = `<span contentEditable="false" data-para-start="true" data-time="${startTime}" class="font-semibold" style="color:${speakerColor}">${formattedTime} </span> <span class="font-semibold" contentEditable="false" data-speaker-name="S1" style="color:${speakerColor}">${newSpeakerName}: </span>`
    const anchorHtml = editorHTMLParts[currentEditorPart].includes(
      anchorNodeData.outerHTML
    )
      ? anchorNodeData.outerHTML
      : ''
    if (anchorHtml) {
      const updatedHTML = editorHTMLParts[currentEditorPart].replace(
        anchorHtml,
        speakerNameHtml + anchorHtml
      )
      if (!editorRef.current) return
      editorRef.current.innerHTML = updatedHTML.startsWith('<br> <br>')
        ? updatedHTML.replace('<br> <br> ', '')
        : updatedHTML
      const updatedEditorHTMLParts = [...editorHTMLParts]
      updatedEditorHTMLParts[currentEditorPart] = updatedHTML
      setEditorHTMLParts(updatedEditorHTMLParts)
    }

    setSpeakerNameModalOpen(false)
    setNewSpeakerName('')
  }

  const sectionChangeHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.dataset.value
    if (!value) return
    setSelectedSection(value)
  }

  const fetchFileDetails = async () => {
    try {
      const orderRes = await axiosInstance.get(
        `${BACKEND_URL}/order-details?orderId=${params?.orderId}`
      )
      setOrderDetails(orderRes.data)
      setCfd(orderRes.data.cfd)
      const cfStatus = [
        'FORMATTED',
        'REVIEWER_ASSIGNED',
        'REVIEW_COMPLETED',
        'FINALIZER_ASSIGNED',
      ]
      let step = 'QC'
      if (cfStatus.includes(orderRes.data.status)) {
        step = 'CF'
      }

      if (orderRes.data.status === 'PRE_DELIVERED') {
        if (orderRes.data.orderType === 'TRANSCRIPTION_FORMATTING') {
          step = 'CF'
        } else {
          step = 'QC'
        }
      }
      setStep(step)
      setDownloadableType(step === 'QC' ? 'text' : 'marking')
      const transcriptRes = await axiosInstance.get(
        `${BACKEND_URL}/fetch-transcript?fileId=${orderRes.data.fileId}&step=${step}&orderId=${orderRes.data.orderId}`
      )
      setTranscript(transcriptRes.data.result.transcript)
      setCtms(transcriptRes.data.result.ctms)
      return orderRes.data
    } catch (error) {
      toast.error('Failed to fetch file details')
    }
  }

  const getHTMLParts = (html: string) => {
    const htmlParts: string[] = []
    let currentPart = ''
    let wordCount = 0
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const allNodes = doc.body.childNodes
    let paragraphOpen = false

    allNodes.forEach((node, index) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement
        const isWordSpan = element.classList.contains('word-span')
        const isLastNode = index === allNodes.length - 1
        const isNewParagraph =
          element.nextSibling && element.nextSibling.nodeName === 'BR'

        if (element.nodeName === 'SPAN' && isWordSpan) {
          wordCount++
        }

        currentPart += element.outerHTML + ' '

        if (isNewParagraph) {
          paragraphOpen = false // End of a paragraph
          if (wordCount >= 400 && !paragraphOpen) {
            // If word count exceeds 400 and paragraph is not open, push to parts and reset
            htmlParts.push(currentPart.trim())
            currentPart = ''
            wordCount = 0
          }
        } else {
          paragraphOpen = true // Inside a paragraph
        }

        if (isLastNode && currentPart.trim() !== '') {
          // For the last node, add remaining content to parts
          htmlParts.push(currentPart.trim())
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        // Handle text nodes that are not within an element (unlikely, but just in case)
        currentPart += node.textContent.trim() + ' '
        wordCount += node.textContent.trim().split(' ').length
      }
    })

    // Check if there's any leftover content to be added to the parts
    if (currentPart.trim() !== '' && !htmlParts.includes(currentPart.trim())) {
      htmlParts.push(currentPart.trim())
    }

    return htmlParts
  }

  useEffect(() => {
    if (!session || !session.user) return

    if (
      session.user.role !== 'QC' &&
      session.user.role !== 'REVIEWER' &&
      session.user.role !== 'ADMIN'
    ) {
      router.replace('/') //TODO: Redirect to another page
      return
    }
  }, [session])

  useEffect(() => {
    const userAgent = navigator.userAgent
    const isMobileOrTablet =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      )

    if (isMobileOrTablet) {
      router.push('/')
    }

    fetchFileDetails()

    const file = localStorage.getItem(orderDetails?.fileId as string)
    if (file) {
      setNotes(JSON.parse(file).notes)
    }
  }, [])

  useEffect(() => {
    const { html, speakers } = generateHTML(transcript, ctms, step as string)
    setSpeakers(speakers)

    const htmlParts = getHTMLParts(html)
    setEditorHTMLParts(htmlParts)

    if (editorRef.current) {
      editorRef.current.innerHTML = htmlParts[currentEditorPart].startsWith(
        '<br> <br>'
      )
        ? htmlParts[currentEditorPart].replace('<br> <br> ', '')
        : htmlParts[currentEditorPart]
    }
    setEditorHTML(html)
  }, [transcript])

  const handleTabChange = () => {
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = editorHTMLParts[
          currentEditorPart
        ]?.startsWith('<br> <br>')
          ? editorHTMLParts[currentEditorPart].replace('<br> <br> ', '')
          : editorHTMLParts[currentEditorPart]
      }
    }, 1)
    const diff = diffWords(transcript, getEditorText())
    setDiffOutput(diff)
  }

  useEffect(() => {
    handleTabChange()
  }, [selectedSection])

  const getEditorText = () => {
    if (!editorRef.current) return ''
    editorRef.current.innerHTML = editorHTMLParts.join('')
    const text = editorRef.current.innerText
    editorRef.current.innerHTML = editorHTMLParts[currentEditorPart]
    return text
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const html = e.target.innerHTML
    const htmlParts = [...editorHTMLParts]
    htmlParts[currentEditorPart] = html
    setEditorHTMLParts(htmlParts)
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setNotes(text)
  }

  const handleSubmit = async () => {
    if (!orderDetails || !orderDetails.orderId || !step) return
    const toastId = toast.loading(`Submitting Transcription...`)
    try {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        submit: true,
      }))
      const playedPercentage = getPlayedPercentage()
      if (
        !disableAudioPlayCheck &&
        playedPercentage < MINIMUM_AUDIO_PLAYBACK_PERCENTAGE
      ) {
        throw new Error(`MAPPNM`) //Stands for "Minimum Audio Playback Percentage Not Met"
      }

      if (step === 'CF') {
        await axiosInstance.post(`${BACKEND_URL}/submit-finalizer`, {
          fileId: orderDetails.fileId,
          orderId: orderDetails.orderId,
          mode: editorMode.toLowerCase(),
        })
      } else {
        if (!fileToUpload.isUploaded || !fileToUpload.renamedFile)
          throw new Error('UF')

        const formData = new FormData()
        formData.append('file', fileToUpload.renamedFile)

        const queryString = `fileId=${orderDetails.fileId}&orderId=${orderDetails.orderId
          }&mode=${editorMode.toLowerCase()}`

        await axiosInstance.post(
          `${BACKEND_URL}/submit-qc?${queryString}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )
      }

      toast.dismiss(toastId)
      const successToastId = toast.success(
        `Transcription submitted successfully`
      )
      toast.dismiss(successToastId)
      router.push(`/transcribe/${step === 'QC' ? 'qc' : 'legal-cf-reviewer'}`)
    } catch (error) {
      setTimeout(() => {
        toast.dismiss(toastId)
      }, 100) //Had to use this setTimeout because the minimum percentage check gives an error Immediately

      let errorText = 'Error while submitting transcript' // Default error message
      switch ((error as Error).message) {
        case 'MAPPNM':
          errorText = `Please make sure you have at least ${MINIMUM_AUDIO_PLAYBACK_PERCENTAGE}% of the audio played.`
          break
        case 'UF':
          errorText = `Please upload a file before submitting`
          break
        // Add more cases as needed
      }
      console.log(error)
      const errorToastId = toast.error(errorText)
      toast.dismiss(errorToastId)
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        submit: false,
      }))
    }
  }

  const handleSave = async () => {
    return //!Disabling save button for now
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      save: true,
    }))
    const transcript = getEditorText()
    console.log(transcript)
    localStorage.setItem(orderDetails.fileId, JSON.stringify({ notes: notes }))
    const toastId = toast.loading(`Saving Transcription...`)
    try {
      await axiosInstance.post(`${BACKEND_URL}/save-transcript`, {
        fileId: orderDetails.fileId,
        transcript,
        step,
        cfd: cfd,
        orderId: orderDetails.orderId,
      })
      toast.dismiss(toastId)
      const successToastId = toast.success(`Transcription saved successfully`)
      toast.dismiss(successToastId)
    } catch (error) {
      toast.dismiss(toastId)
      const errorToastId = toast.error(`Error while saving transcript`)
      toast.dismiss(errorToastId)
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        save: false,
      }))
    }
  }

  const getWaveSurfer = (wavesurfer: WaveSurfer | null) => {
    setWavesurfer(wavesurfer)
  }

  const [audioPlayed, setAudioPlayed] = useState(new Set<number>())
  const [playedPercentage, setPlayedPercentage] = useState(0)

  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     await handleSave()
  //   }, 1000 * 60 * AUTOSAVE_INTERVAL)

  //   return () => clearInterval(interval)
  // }, [orderDetails, editorHTMLParts])

  useEffect(() => {
    const updatePlayedPercentage = () => {
      if (!wavesurfer) return
      const duration = wavesurfer.getDuration()
      const playedArray = Array.from(audioPlayed).sort((a, b) => a - b)
      let uniquePlayedSeconds = 0
      if (playedArray.length > 0) {
        uniquePlayedSeconds = playedArray.reduce(
          (acc, cur, index, srcArray) => {
            if (index === 0) {
              return 1 // Count the first second as played
            } else {
              // Only count as unique if it's not the same as the previous second
              return cur !== srcArray[index - 1] ? acc + 1 : acc
            }
          },
          0
        )
      }
      const percentagePlayed = (uniquePlayedSeconds / duration) * 100
      setPlayedPercentage(Math.min(100, percentagePlayed)) // Ensure percentage does not exceed 100
    }

    wavesurfer?.on('audioprocess', () => {
      if (!wavesurfer) return
      const currentTime = Math.floor(wavesurfer.getCurrentTime())
      setAudioPlayed((prev) => new Set(prev.add(currentTime)))
      if (!wavesurfer) return
      let highlightedWord = document.querySelector('.highlighted')
      const children = Array.from(document.querySelectorAll('.word-span'))

      for (let i = 0; i < children.length; i++) {
        const word = children[i]
        const { timeStart, timeEnd } = (word as HTMLElement).dataset
        if (!timeStart || !timeEnd) return
        if (+timeStart <= currentTime && +timeEnd >= currentTime) {
          if (highlightedWord) {
            highlightedWord.classList.remove('highlighted')
          }
          word.classList.add('highlighted')
          highlightedWord = word
          break
        }
      }
    })

    wavesurfer?.on('audioprocess', updatePlayedPercentage)
    wavesurfer?.on('drag', updatePlayedPercentage)
    wavesurfer?.on('pause', updatePlayedPercentage)
    wavesurfer?.on('finish', updatePlayedPercentage)

    return () => {
      wavesurfer?.un('audioprocess', updatePlayedPercentage)
      wavesurfer?.un('drag', updatePlayedPercentage)
      wavesurfer?.un('pause', updatePlayedPercentage)
      wavesurfer?.un('finish', updatePlayedPercentage)
    }
  }, [wavesurfer, audioPlayed])

  const getPlayedPercentage = () => playedPercentage

  const reportHandler = async () => {
    const { reportComment, reportOption } = reportDetails
    if (!reportComment || !reportOption)
      return toast.error('Please enter a valid comment and report option.')
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      report: true,
    }))
    try {
      await axiosInstance.post(`${BACKEND_URL}/report-file`, {
        ...reportDetails,
        orderId: orderDetails.orderId,
      })
      setReportModalOpen(false)
      setReportDetails({ reportComment: '', reportOption: '' })
    } catch (error) {
      toast.error('Failed to report file')
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        report: false,
      }))
    }
  }

  const fetchPdfFile = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/get-pdf-document/${orderDetails.fileId}`
      )
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } else {
        toast.error('Failed to fetch audio file')
      }
    } catch (error) {
      toast.error('Failed to fetch pdf file')
    }
  }

  const regenDocx = async () => {
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      regenDocx: true,
    }))
    const toastId = toast.loading(`Generating Document...`)
    try {
      await axiosInstance.post(`${BACKEND_URL}/generate-cf-docx`, {
        fileId: orderDetails.fileId,
        orderId: orderDetails.orderId,
      })
      await fetchPdfFile()
      setRegenCount(regenCount + 1)
      toast.dismiss(toastId)
      const successToastId = toast.success(`Document generated successfully`)
      toast.dismiss(successToastId)
    } catch (error) {
      toast.dismiss(toastId)
      const errorToastId = toast.error(`Error while generating document`)
      toast.dismiss(errorToastId)
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        regenDocx: false,
      }))
    }
  }

  const downloadBlankDocx = async () => {
    const toastId = toast.loading('Downloading file...')
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      download: true,
    }))
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/download-blank-docx?fileId=${orderDetails.fileId}&type=${downloadableType}&orgName=${orderDetails.orgName}&templateName=${orderDetails.templateName}`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${orderDetails.fileId}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.dismiss(toastId)
      const successToastId = toast.success(`File downloaded successfully`)
      toast.dismiss(successToastId)
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Error downloading file')
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        download: false,
      }))
    }
  }

  const getEditorModeOptions = async () => {
    try {
      // const response = await axiosInstance.get(`${BACKEND_URL}/get-options/${orderDetails.orderId}`);
      setEditorMode('Manual')
      // setEditorModeOptions(response.data.options);
    } catch (error) {
      toast.error('Error fetching editor mode options')
    }
  } //Setting the editor mode to manual for now at cf step

  const getEditorMode = (editorMode: string) => {
    setEditorMode(editorMode)
  }

  useEffect(() => {
    if (step !== 'QC' && orderDetails.orderId) {
      getEditorModeOptions()
    }
  }, [orderDetails])

  useEffect(() => {
    if (!orderDetails.orderId || !orderDetails.fileId) return
    if (!initialPDFLoaded && step !== 'QC' && editorMode === 'Editor') {
      regenDocx()
      setInitialPDFLoaded(true)
    }
  }, [orderDetails, editorMode])

  const handleFilesUpload = async (payload: UploadFilesType) => {
    try {
      if (payload.files.length > 1) {
        toast.error('Only one file can be uploaded at a time.')
        return
      }

      if (
        payload.files[0].type !==
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        toast.error('Only docx files can be uploaded.')
        return
      }
      const file = payload.files[0]
      const renamedFile = new File([file], `${orderDetails.fileId}_cf.docx`, {
        type: file.type,
      })
      setFileToUpload({ renamedFile, originalFile: file })
    } catch (error) {
      throw error
    }
  }

  const uploadFile = async () => {
    const file = fileToUpload.renamedFile
    if (!file) return toast.error('Please select a file to upload.')

    if (status !== 'authenticated' || !session?.user?.token) {
      return
    }
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      upload: true,
    }))

    const formData = new FormData()
    formData.append('file', file)
    try {
      await axiosInstance.post(`${BACKEND_URL}/upload-docx`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${session.user.token}`,
        },
      })
      toast.success('File uploaded successfully')
    } catch (uploadError) {
      toast.error('Failed to upload file')
    } finally {
      setFileToUpload({ renamedFile: null, originalFile: null })
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        upload: false,
      }))
    }
  }

  const editorClickHandler = () =>
    toast.error('Editing is not allowed in manual mode.')

  const editorDoubleClickHandler = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.altKey) {
      e.preventDefault()
      const target = e.target as Element // Casting e.target to Element to access classList
      if (target.classList.contains('word-span')) {
        const startTime = Number((target as HTMLElement).dataset.timeStart)
        if (!startTime) return
        wavesurfer?.seekTo(startTime / wavesurfer.getDuration())
      }
    }
  }

  const speakerNameChangeHandler = (oldName: string, newName: string) => {
    if (oldName === newName) {
      setEditingSpeaker({ oldName: '', newName: '' })
      return
    }

    const speaker = document.querySelector<HTMLElement>(
      `[data-speaker-name="${oldName}"]`
    )
    if (speaker) {
      const newEditorHtml = editorHTML
        .replaceAll(oldName + ':', newName + ':')
        .replaceAll(
          `data-speaker-name="${oldName}"`,
          `data-speaker-name="${newName}"`
        )
      setEditorHTML(newEditorHtml)

      const htmlParts = getHTMLParts(newEditorHtml)
      setEditorHTMLParts(htmlParts)

      setEditingSpeaker({ oldName: '', newName: '' })
      setSpeakers((prevSpeakers) => {
        const newSpeakers = { ...prevSpeakers }
        if (newSpeakers[oldName + ':']) {
          newSpeakers[newName + ':'] = newSpeakers[oldName + ':']
          delete newSpeakers[oldName + ':']
        }
        return newSpeakers
      })
    }
  }

  // const handleSpellcheck = async () => {
  //   const toastId = toast.loading('Spellchecking...')
  //   try {
  //     const transcript = getEditorText()
  //     const result = await axiosInstance.post(`${BACKEND_URL}/spellcheck`, {
  //       transcript,
  //     })
  //     const misspelledWords = result.data.misspelledWords.map(
  //       (word: { word: string; suggestions: string[] }) => word.word
  //     )
  //     const words = document.querySelectorAll('.word-span')

  //     words.forEach((word) => {
  //       const wordText = word.textContent
  //         ?.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
  //         .trim()
  //       if (misspelledWords.includes(wordText)) {
  //         word.classList.add('misspelled')
  //         const suggestions =
  //           result.data.misspelledWords.find(
  //             (misspelledWord: { word: string; suggestions: string[] }) =>
  //               misspelledWord.word === wordText
  //           ).suggestions || []
  //           ; (word as HTMLElement).dataset.wordSuggestions =
  //             JSON.stringify(suggestions)
  //       }
  //     })
  //     toast.dismiss(toastId)

  //     const successToastId = toast.success('Spellchecking successful')
  //     toast.dismiss(successToastId)
  //   } catch (error) {
  //     toast.dismiss(toastId)
  //     toast.error('Failed to spellcheck')
  //   }
  // }

  //! temp disable spellcheck

  const correctSpelling = (word: string, node: HTMLElement | null) => {
    if (!node) return
    node.innerText = word + ' '
    setSpellcheckModal(false)
    setWordSuggestions({
      suggestions: [],
      node: null,
    })
  }

  const downloadEditorDocxFile = async () => {
    const toastId = toast.loading('Downloading file...')
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      download: true,
    }))
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/file-docx-signed-url?fileId=${orderDetails.fileId}&docType=TRANSCRIPTION_DOC`
      )
      const url = response?.data?.signedUrl
      if (url) {
        window.location.href = url
      } else {
        console.error('No URL provided for download.')
        throw 'No URL provided for download.'
      }
      toast.dismiss(toastId)
      const successToastId = toast.success(`File downloaded successfully`)
      toast.dismiss(successToastId)
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Error downloading file')
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        download: false,
      }))
    }
  }

  const downloadEditorTextFile = async () => {
    const toastId = toast.loading('Downloading file...')
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      download: true,
    }))
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/download-text-file?fileId=${orderDetails.fileId}`,
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${orderDetails.fileId}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()

      toast.dismiss(toastId)
      const successToastId = toast.success(`File downloaded successfully`)
      toast.dismiss(successToastId)
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Error downloading file')
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        download: false,
      }))
    }
  }

  const downloadMP3 = async () => {
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      mp3: true,
    }))
    try {
      const response = await axiosInstance.get(
        `${BACKEND_URL}/download-mp3?fileId=${orderDetails.fileId}`
      )
      if (response.status === 200) {
        const data = response.data
        window.open(data.url, '_blank')
      }

      const successToastId = toast.success(`MP3 downloaded successfully`)
      toast.dismiss(successToastId)
    } catch (error) {
      toast.error('Error downloading mp3')
    } finally {
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        mp3: false,
      }))
    }
  }

  const handleTextFilesUpload = async (payload: UploadFilesType) => {
    try {
      if (payload.files.length > 1) {
        toast.error('Only one file can be uploaded at a time.')
        return
      }

      if (payload.files[0].type !== 'text/plain') {
        toast.error('Only text files can be uploaded.')
        return
      }
      const file = payload.files[0]
      const renamedFile = new File([file], `${orderDetails.fileId}_qc.txt`, {
        type: file.type,
      })
      setFileToUpload({ renamedFile, originalFile: file, isUploaded: false })
    } catch (error) {
      throw error
    }
  }

  const uploadTextFile = async () => {
    const file = fileToUpload.renamedFile

    if (!file) return toast.error('Please select a file to upload.')

    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      upload: true,
    }))

    const formData = new FormData()
    formData.append('file', file)

    try {
      await axiosInstance.post(
        `${BACKEND_URL}/upload-text-file?fileId=${orderDetails.fileId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${session?.user?.token}`,
          },
        }
      )
      toast.success('File uploaded successfully')
    } catch (uploadError) {
      toast.error('Failed to upload file')
    } finally {
      setFileToUpload((prev) => ({ ...prev, isUploaded: true }))
      setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        upload: false,
      }))
    }
  }

  return (
    <div className='bg-[#F7F5FF] h-screen'>
      <Header
        editorMode={editorMode}
        editorModeOptions={editorModeOptions}
        getEditorMode={getEditorMode}
        notes={notes}
        setNotes={setNotes}
      />
      <div className='flex justify-between px-16 my-5'>
        <p className='inline-block font-semibold'>{orderDetails.filename}</p>
        <div className='inline-flex'>
          <Button
            disabled={buttonLoading.mp3}
            onClick={downloadMP3}
            className='mr-2'
          >
            {' '}
            {buttonLoading.mp3 && (
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
            )}{' '}
            Download MP3
          </Button>
          {step !== 'QC' && (
            <>
              {editorMode === 'Manual' && (
                <>
                  <Dialog>
                    <DialogTrigger>
                      <Button>Download File</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          Choose transcript type to download
                        </DialogTitle>
                        <RadioGroup
                          defaultValue='marking'
                          onValueChange={setDownloadableType}
                          className='flex gap-10 mb-5'
                        >
                          <div className='flex items-center space-x-2'>
                            <RadioGroupItem value='marking' id='marking' />
                            <Label htmlFor='marking'>With Markings</Label>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <RadioGroupItem
                              value='no-marking'
                              id='no-marking'
                            />
                            <Label htmlFor='no-marking'>Without Markings</Label>
                          </div>
                        </RadioGroup>
                      </DialogHeader>
                      <Button
                        disabled={buttonLoading.download}
                        onClick={downloadBlankDocx}
                      >
                        {' '}
                        {buttonLoading.download && (
                          <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                        )}{' '}
                        Download File
                      </Button>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger>
                      <Button className='ml-2'>Upload File</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Upload Docx File</DialogTitle>
                        <div className='pt-5'>
                          <div className='flex flex-col items-center p-[32px] rounded-[8px] border border-indigo-600 border-dashed md:w-full'>
                            <div className='flex gap-3 text-base font-medium leading-6'>
                              <FileUp />
                              <div className='mb-5'>Upload file</div>
                            </div>
                            {fileToUpload.originalFile && (
                              <div>{fileToUpload.originalFile.name}</div>
                            )}
                            <div className='flex gap-4 font-semibold text-indigo-600 leading-[133%]'>
                              <input
                                id='fileInput'
                                type='file'
                                multiple
                                hidden
                                onChange={(
                                  event: ChangeEvent<HTMLInputElement>
                                ) =>
                                  event.target.files &&
                                  handleFilesUpload({
                                    files: event.target.files,
                                    type: 'files',
                                  })
                                }
                                accept='docx'
                              />
                              <label
                                htmlFor='fileInput'
                                className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                              >
                                Choose File
                              </label>
                            </div>
                          </div>
                        </div>
                      </DialogHeader>
                      <DialogClose asChild>
                        <Button
                          disabled={buttonLoading.upload}
                          onClick={uploadFile}
                        >
                          {' '}
                          {buttonLoading.upload && (
                            <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                          )}{' '}
                          Upload File
                        </Button>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </>
          )}

          {step === 'QC' && (
            <>
              <Button
                disabled={buttonLoading.download}
                onClick={downloadEditorTextFile}
              >
                {' '}
                {buttonLoading.download && (
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                )}{' '}
                Download Text File
              </Button>

              <Dialog>
                <DialogTrigger>
                  <Button className='ml-2'>Upload QCed File</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Docx File</DialogTitle>
                    <div className='pt-5'>
                      <div className='flex flex-col items-center p-[32px] rounded-[8px] border border-indigo-600 border-dashed md:w-full'>
                        <div className='flex gap-3 text-base font-medium leading-6'>
                          <FileUp />
                          <div className='mb-5'>Upload file</div>
                        </div>
                        {fileToUpload.originalFile && (
                          <div>{fileToUpload.originalFile.name}</div>
                        )}
                        <div className='flex gap-4 font-semibold text-indigo-600 leading-[133%]'>
                          <input
                            id='fileInput'
                            type='file'
                            multiple
                            hidden
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              event.target.files &&
                              handleTextFilesUpload({
                                files: event.target.files,
                                type: 'files',
                              })
                            }
                            accept='text/plain'
                          />
                          <label
                            htmlFor='fileInput'
                            className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                          >
                            Choose File
                          </label>
                        </div>
                      </div>
                    </div>
                  </DialogHeader>
                  <DialogClose asChild>
                    <Button
                      disabled={buttonLoading.upload}
                      onClick={uploadTextFile}
                    >
                      {' '}
                      {buttonLoading.upload && (
                        <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                      )}{' '}
                      Upload File
                    </Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>

              <Button
                disabled={buttonLoading.download || !fileToUpload.isUploaded}
                onClick={downloadEditorDocxFile}
                className='ml-2'
              >
                {' '}
                {buttonLoading.download && (
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                )}{' '}
                Download Docx File
              </Button>
            </>
          )}
          {editorMode === 'Editor' && step !== 'QC' && (
            <Button
              variant='outline'
              className='border border-[#6442ED] text-[#6442ED] hover:text-[#6442ede6] ml-2'
              onClick={regenDocx}
              disabled={buttonLoading.regenDocx}
            >
              {' '}
              {buttonLoading.regenDocx && (
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              )}{' '}
              Regenerate Document
            </Button>
          )}
          <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report File</DialogTitle>
                <DialogDescription>
                  Choose a reason and add your comment for reporting.
                </DialogDescription>
                <div className='flex flex-col h-60 justify-between'>
                  <Select
                    value={reportDetails.reportOption}
                    onValueChange={(value) =>
                      setReportDetails((prevValue) => ({
                        ...prevValue,
                        reportOption: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select a reason' />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reportReasonMap).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <Label htmlFor='report-comment'>Enter Comment</Label>
                    <Textarea
                      rows={4}
                      onChange={(e) =>
                        setReportDetails((prevValue) => ({
                          ...prevValue,
                          reportComment: e.target.value,
                        }))
                      }
                      id='report-comment'
                      placeholder='Enter your comment...'
                    />
                  </div>
                  <Button
                    variant='destructive'
                    onClick={reportHandler}
                    disabled={buttonLoading.report}
                  >
                    {' '}
                    {buttonLoading.report && (
                      <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                    )}{' '}
                    Report
                  </Button>
                </div>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          {/* <Button onClick={handleSpellcheck} className='ml-2'>
            Spellcheck
          </Button> */}
          <Button
            onClick={() => setReportModalOpen(true)}
            className='ml-2'
            variant='destructive'
          >
            Report
          </Button>
          {editorMode === 'Editor' ||
            (step === 'QC' && (
              <Button
                onClick={handleSave}
                // disabled={buttonLoading.save}
                disabled={true}
                className='ml-2'
              >
                {' '}
                {buttonLoading.save && (
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                )}{' '}
                Save
              </Button>
            ))}
          <Button
            onClick={handleSubmit}
            disabled={buttonLoading.submit || session?.user?.role === 'ADMIN'}
            className='ml-2'
          >
            {' '}
            {buttonLoading.submit && (
              <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
            )}{' '}
            Submit
          </Button>
        </div>
      </div>
      <div className='flex flex-col items-center h-4/5'>
        <div
          className={`flex ${step !== 'QC' && editorMode === 'Editor'
            ? 'justify-between'
            : 'justify-center'
            } w-[91%] h-full`}
        >
          {step !== 'QC' && editorMode === 'Editor' && (
            <SectionSelector
              selectedSection={selectedSection}
              sectionChangeHandler={sectionChangeHandler}
            />
          )}
          <div
            className={`${step !== 'QC' && editorMode === 'Editor' ? 'w-1/2' : 'w-3/4'
              } flex flex-col justify-between`}
          >
            <AudioPlayer
              playerControls={playerControls}
              fileId={orderDetails.fileId}
              getWaveSurfer={getWaveSurfer}
            />
            <div className='h-3/4'>
              {selectedSection === 'proceedings' && (
                <Tabs
                  onValueChange={handleTabChange}
                  defaultValue='transcribe'
                  className='h-full'
                >
                  <div className='flex bg-white border border-gray-200 rounded-t-2xl px-4 text-md font-medium'>
                    <TabsList>
                      <TabsTrigger className='text-base' value='transcribe'>
                        Transcribe
                      </TabsTrigger>
                      <TabsTrigger className='text-base' value='speaker'>
                        Speakers
                      </TabsTrigger>
                      <TabsTrigger className='text-base' value='notes'>
                        Notes
                      </TabsTrigger>
                      <TabsTrigger className='text-base' value='diff'>
                        Diff
                      </TabsTrigger>
                      <TabsTrigger className='text-base' value='info'>
                        Info
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent className='h-[86%] mt-0' value='transcribe'>
                    <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                      <div
                        className='h-full outline-none'
                        ref={editorRef}
                        onClick={editorClickHandler}
                        onInput={handleTextChange}
                        onDoubleClick={editorDoubleClickHandler}
                        // contentEditable={
                        //   step === 'QC' || editorMode === 'Editor'
                        //     ? true
                        //     : false
                        // }

                        contentEditable={false}
                      ></div>
                    </div>
                  </TabsContent>
                  <TabsContent className='h-[86%] mt-0' value='speaker'>
                    <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                      <div>
                        {Object.entries(speakers).map(([key, value]) => {
                          const speaker = key.replace(':', '')
                          return (
                            <div
                              key={speaker}
                              style={{ color: value }}
                              data-speaker-name={speaker}
                              className='mb-5 font-bold border-b-2 flex justify-between px-5'
                            >
                              <div
                                className='outline-none'
                                contentEditable={
                                  editingSpeaker.oldName === speaker
                                }
                                onInput={(e) =>
                                  setEditingSpeaker({
                                    oldName: speaker,
                                    newName: (e.target as HTMLElement)
                                      .innerText,
                                  })
                                }
                              >
                                {speaker}
                              </div>
                              <div>
                                {editingSpeaker.oldName !== speaker && (
                                  <button
                                    onClick={() =>
                                      setEditingSpeaker({
                                        oldName: speaker,
                                        newName: '',
                                      })
                                    }
                                  >
                                    <Pencil />
                                  </button>
                                )}

                                {editingSpeaker.oldName === speaker && (
                                  <button
                                    onClick={() =>
                                      speakerNameChangeHandler(
                                        speaker,
                                        editingSpeaker.newName
                                          ? editingSpeaker.newName
                                          : speaker
                                      )
                                    }
                                  >
                                    <Check />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent className='h-[86%] mt-0' value='notes'>
                    <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                      <Textarea
                        placeholder='Start typing...'
                        className='h-full resize-none'
                        value={notes}
                        onChange={handleNotesChange}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent className='h-[86%] mt-0' value='diff'>
                    <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                      <div>
                        <div className='diff'>
                          {diffOutput.map((part, index) => (
                            <span
                              key={index}
                              className={
                                part.added
                                  ? 'added'
                                  : part.removed
                                    ? 'removed'
                                    : ''
                              }
                            >
                              {part.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent className='h-[86%] mt-0' value='info'>
                    <div className='bg-white border border-gray-200 border-t-0 rounded-b-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                      <Textarea
                        placeholder='Customer instructions'
                        className='h-full resize-none'
                        value={orderDetails.instructions}
                        readOnly
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              {selectedSection === 'title' && (
                <div className='bg-white border border-gray-200 rounded-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                  <div>{renderTitleInputs(cfd, setCfd)}</div>
                </div>
              )}

              {selectedSection === 'case-details' && (
                <div className='bg-white border border-gray-200 rounded-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                  {renderCaseDetailsInputs(cfd, setCfd)}
                </div>
              )}

              {selectedSection === 'certificates' && (
                <div className='bg-white border border-gray-200 rounded-2xl min-h-96 px-5 py-5 overflow-y-scroll h-[99%] no-scrollbar'>
                  {renderCertificationInputs(cfd, setCfd)}
                </div>
              )}
            </div>
          </div>
          {step !== 'QC' && editorMode === 'Editor' && (
            <div className='bg-blue-500 w-1/3 rounded-2xl border border-gray-200 overflow-hidden'>
              <div className='overflow-y-scroll h-full'>
                <RenderPDFDocument key={regenCount} file={pdfUrl} />
              </div>
            </div>
          )}
        </div>
      </div>
      <Dialog open={spellcheckModal} onOpenChange={setSpellcheckModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Spellcheck</DialogTitle>
            {wordSuggestions.suggestions.map((word, index) => (
              <div className='w-full flex justify-center' key={index}>
                <button
                  onClick={() => correctSpelling(word, wordSuggestions.node)}
                  className='hover:bg-gray-100 w-4/5 rounded-sm py-2'
                >
                  {word}
                </button>
              </div>
            ))}
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog
        open={speakerNameModalOpen}
        onOpenChange={setSpeakerNameModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Speaker Name</DialogTitle>
            <div>
              <Label htmlFor='speaker-name'>Enter Speaker Name</Label>
              <Input
                id='speaker-name'
                placeholder='Speaker Name'
                value={newSpeakerName}
                onChange={(e) =>
                  setNewSpeakerName(e.target.value.toUpperCase())
                }
              />
            </div>
            <Button onClick={insertNewSpeaker}>Insert</Button>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Editor