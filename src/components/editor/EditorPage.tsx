'use client'

import { Cross1Icon, ReloadIcon, CheckIcon } from '@radix-ui/react-icons'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import { getUserEditorSettingsAction } from '@/app/actions/editor/settings'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import renderCaseDetailsInputs from '@/components/editor/CaseDetailsInput'
import renderCertificationInputs from '@/components/editor/CertificationInputs'
import { EditorHandle } from '@/components/editor/Editor'
import Header from '@/components/editor/Header'
import SectionSelector from '@/components/editor/SectionSelector'
import SubmissionValidation from '@/components/editor/SubmissionValidation'
import {
  DiffTabComponent,
  EditorTabComponent,
  InfoTabComponent,
  SpeakersTabComponent
} from '@/components/editor/TabComponents'
import { Tabs, TabsList, TabsTrigger } from '@/components/editor/Tabs'
import renderTitleInputs from '@/components/editor/TitleInputs'
import Topbar from '@/components/editor/Topbar'
import WaveformHeatmap from '@/components/editor/WaveformHeatmap'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RenderPDFDocument } from '@/components/utils'
import { AUTOSAVE_INTERVAL } from '@/constants'
import usePreventMultipleTabs from '@/hooks/usePreventMultipleTabs'
import { AlignmentType, EditorSettings } from '@/types/editor'
import {
  ShortcutControls,
  useShortcuts,
  defaultShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  CTMType,
  regenDocx,
  fetchFileDetails,
  handleSave,
  handleSubmit,
  searchAndSelect,
  replaceTextHandler,
  CustomerQuillSelection,
  autoCapitalizeSentences,
  getFormattedContent,
  EditorData,
  calculateBlankPercentage,
  calculateEditListenCorrelationPercentage,
  calculateSpeakerChangePercentage,
  calculateSpeakerMacroF1Score,
  getTestTranscript,
 
} from '@/utils/editorUtils'
import { persistEditorDataIDB } from '@/utils/indexedDB'
import { getFormattedTranscript } from '@/utils/transcript'
import { diff_match_patch, DmpDiff } from '@/utils/transcript/diff_match_patch'

export type SupportingDocument = {
  filename: string
  signedUrl: string
  fileExtension: string
  fileId: string
}
export type OrderDetails = {
  orderId: string
  filename: string
  orderType: string
  fileId: string
  templateName: string
  orgName: string
  cfd: string
  status: string
  instructions: string
  userId: string
  remainingTime: string
  duration: string
  LLMDone: boolean
  customFormatOption?: string
  outputFormat?: string
  supportingDocuments?: SupportingDocument[]
  email: string
  speakerOptions: {
    fn: string;
    ln: string;
  }[],
  isTestOrder: boolean
}

export type UploadFilesType = {
  files: FileList
  type: string
}

function EditorPage() {
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
    userId: '',
    remainingTime: '',
    duration: '',
    LLMDone: false,
    email: '',
    speakerOptions: [],
    isTestOrder: false
  })
  const [cfd, setCfd] = useState('')
  const [notes, setNotes] = useState('')
  const notesDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [regenCount, setRegenCount] = useState(0)
  const [initialPDFLoaded, setInitialPDFLoaded] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [editorMode, setEditorMode] = useState('')
  const [editorModeOptions] = useState<string[]>([])
  const [fileToUpload, setFileToUpload] = useState<{
    renamedFile: File | null
    originalFile: File | null
    isUploaded?: boolean
  }>({ renamedFile: null, originalFile: null })
  const { data: session } = useSession()
  const [diff, setDiff] = useState<DmpDiff[]>([])
  const [ctms, setCtms] = useState<CTMType[]>([])
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null)
  const [step, setStep] = useState<string>('')
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<'processing' | 'completed'>('processing')
  const [submissionCountdown, setSubmissionCountdown] = useState(5)
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
  const [audioDuration, setAudioDuration] = useState(1)
  const [quillRef, setQuillRef] = useState<React.RefObject<ReactQuill>>()
  const editorRef = useRef<EditorHandle>(null)

  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [lastSearchIndex, setLastSearchIndex] = useState<number>(-1)
  const [findAndReplaceOpen, setFindAndReplaceOpen] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [matchSelection, setMatchSelection] = useState(false)
  const findInputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<CustomerQuillSelection | null>(
    null
  )
  const [searchHighlight, setSearchHighlight] = useState<{
    index: number
    length: number
  } | null>(null)
  const [highlightWordsEnabled, setHighlightWordsEnabled] = useState(true)
  const [fontSize, setFontSize] = useState(16)
  const lastTrackedSecondRef = useRef(-1)
  const [listenCount, setListenCount] = useState<number[]>([])
  const [editedSegments, setEditedSegments] = useState<Set<number>>(new Set())
  const [waveformUrl, setWaveformUrl] = useState('')
  const [finalizerComment, setFinalizerComment] = useState('')
  const [initialEditorData, setInitialEditorData] = useState<EditorData | null>(
    null
  )
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    wordHighlight: true,
    fontSize: 16,
    audioRewindSeconds: 0,
    volume: 100,
    playbackSpeed: 100,
    useNativeContextMenu: false,
    shortcuts: { ...defaultShortcuts },
  })
  const [autoCapitalize, setAutoCapitalize] = useState(true)
  const [highlightNumbersEnabled, setHighlightNumbersEnabled] = useState(false)
  const [isQCValidationPassed, setIsQCValidationPassed] = useState(false)
  const [testTranscript, setTestTranscript] = useState('')
  const [isSettingTest, setIsSettingTest] = useState(false)
  const setSelectionHandler = () => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    const range = quill.getSelection()
    if (range) {
      setSelection({ index: range.index, length: range.length })
    }
  }

  const isActive = usePreventMultipleTabs((params?.fileId as string) || '')

  if (!isActive) {
    router.back()
  }

  const getEditorText = useCallback(
    () => quillRef?.current?.getEditor().getText() || '',
    [quillRef]
  )

  const countMatches = (searchText: string) => {
    if (!quillRef?.current || !searchText) return 0
    const quill = quillRef.current.getEditor()
    let text = quill.getText()
    if (selection && selection.length > 0 && matchSelection) {
      text = text.slice(selection.index, selection.index + selection.length)
    }

    if (matchCase) {
      return (text.match(new RegExp(searchText, 'g')) || []).length
    } else {
      return (text.match(new RegExp(searchText, 'gi')) || []).length
    }
  }

  const replaceTextInstance = (
    findText: string,
    replaceText: string,
    selection: {
      index: number
      length: number
    } | null,
    replaceAll = false
  ) => {
    if (!quillRef?.current) return
    const quill = quillRef.current.getEditor()
    replaceTextHandler(
      quill,
      findText,
      replaceText,
      replaceAll,
      matchCase,
      toast,
      selection,
      matchSelection
    )
  }

  const searchAndSelectInstance = (
    searchText: string,
    selection: {
      index: number
      length: number
    } | null
  ) => {
    if (!quillRef?.current) return
    const quill = quillRef.current.getEditor()
    searchAndSelect(
      quill,
      searchText,
      matchCase,
      lastSearchIndex,
      setLastSearchIndex,
      toast,
      selection,
      setSelection,
      matchSelection,
      false,
      setSearchHighlight
    )
  }

  const searchAndSelectReverseInstance = (
    searchText: string,
    selection: {
      index: number
      length: number
    } | null
  ) => {
    if (!quillRef?.current) return
    const quill = quillRef.current.getEditor()
    searchAndSelect(
      quill,
      searchText,
      matchCase,
      lastSearchIndex,
      setLastSearchIndex,
      toast,
      selection,
      setSelection,
      matchSelection,
      true,
      setSearchHighlight
    )
  }

  const toggleFindAndReplace = useCallback(() => {
    setFindAndReplaceOpen((prev) => !prev)
    setSelectionHandler()
    setTimeout(() => {
      if (findInputRef.current) {
        findInputRef.current.focus()
      }
    }, 50)
  }, [setSelectionHandler])

  const shortcutControls = useMemo(() => {
    const controls: Partial<ShortcutControls> = {
      findNextOccurrenceOfString: () => {
        if (!findAndReplaceOpen) {
          if (quillRef?.current) {
            const quill = quillRef.current.getEditor()
            const selection = quill.getSelection()
            if (selection) {
              const selectedText = quill.getText(
                selection.index,
                selection.length
              )
              if (selectedText) {
                setFindText(selectedText)
                setSelection(null)
                setMatchCount(countMatches(selectedText))
              }
            }
          }
          toggleFindAndReplace()
        } else if (findText) {
          searchAndSelectInstance(findText, selection)
        }
      },
      findThePreviousOccurrenceOfString: () => {
        if (!findAndReplaceOpen) {
          toggleFindAndReplace()
        } else if (findText) {
          searchAndSelectInstance(findText, selection)
        }
      },
      replaceNextOccurrenceOfString: () => {
        if (!findAndReplaceOpen) {
          toggleFindAndReplace()
        } else if (findText && replaceText) {
          replaceTextInstance(findText, replaceText, selection)
        }
      },
      replaceAllOccurrencesOfString: () => {
        if (!findAndReplaceOpen) {
          toggleFindAndReplace()
        } else if (findText && replaceText) {
          replaceTextInstance(findText, replaceText, selection, true)
        }
      },
      repeatLastFind: () => {
        if (findText) {
          searchAndSelectInstance(findText, selection)
        }
      },
      saveChanges: async () => {
        if (editorRef.current) {
          if (!highlightNumbersEnabled) {
            editorRef.current.clearAllHighlights();
          }
          editorRef.current.triggerAlignmentUpdate();
        }
        autoCapitalizeSentences(quillRef, autoCapitalize)
        await handleSave({
          getEditorText,
          orderDetails,
          notes,
          cfd,
          setButtonLoading,
          listenCount,
          editedSegments,
          role: session?.user?.role || '',
        })
        updateFormattedTranscript()

        if (highlightNumbersEnabled && editorRef.current != null) {
          setTimeout(() => {
            if(editorRef.current) {
              editorRef.current.highlightNumbers();
            }
          }, 200);
        }
      },
    }
    return controls as ShortcutControls
  }, [
    getEditorText,
    orderDetails,
    notes,
    step,
    cfd,
    setButtonLoading,
    findText,
    replaceText,
    matchCase,
    lastSearchIndex,
    listenCount,
    editedSegments,
    highlightNumbersEnabled,
    editorRef,
  ])

  useShortcuts(shortcutControls)

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.addEventListener('loadedmetadata', () => {
        setAudioDuration(audioPlayer.duration)
      })
    }
  }, [audioPlayer])

  useEffect(() => {
    if (!initialEditorData || !orderDetails.fileId) return
    persistEditorDataIDB(orderDetails.fileId, { listenCount })
  }, [listenCount, orderDetails.fileId, initialEditorData])

  const sectionChangeHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.dataset.value
    if (!value) return
    setSelectedSection(value)
  }

  useEffect(() => {
    const userAgent = navigator.userAgent
    const isMobileOrTablet =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent
      )

    if (isMobileOrTablet) {
      router.push('/')
    }

    async function loadDetails() {
      if (!session || !session.user) return

      const transcriberId = (['OM', 'ADMIN'].includes(session?.user?.role as string) && (searchParams?.get('userId'))) 
        ? Number(searchParams?.get('userId')) 
        : session?.user?.userId as number;

      const result = await fetchFileDetails({
        params,
        transcriberId,
        user: session?.user,
        setOrderDetails,
        setCfd,
        setStep,
        setCtms,
        setListenCount,
        setIsSettingTest
      })

      if (result) {
        setOrderDetails(result.orderDetails)
        setInitialEditorData(result.initialEditorData)
      }
    }
    loadDetails()
  }, [session, searchParams])

  useEffect(() => {
    const fetchTestTranscript = async () => {
      const transcriberId = (['OM', 'ADMIN'].includes(session?.user?.role as string) && (searchParams?.get('userId'))) 
        ? Number(searchParams?.get('userId')) 
        : session?.user?.userId as number;
      const testTranscript = await getTestTranscript(orderDetails.fileId, transcriberId)
      if(testTranscript) {
        setTestTranscript(testTranscript)
      }
    }
    if(orderDetails.isTestOrder) {
      fetchTestTranscript()
    }
  }, [orderDetails.orderId, orderDetails.fileId, orderDetails.isTestOrder, initialEditorData, params, session?.user?.role, searchParams])

  useEffect(() => {
    const closeFindAndReplaceOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && findAndReplaceOpen) {
        setFindAndReplaceOpen(false)
      }
    }
    window.addEventListener('keydown', closeFindAndReplaceOnEscape)
    return () => {
      window.removeEventListener('keydown', closeFindAndReplaceOnEscape)
    }
  }, [findAndReplaceOpen])

  const handleTabsValueChange = async (value: string) => {
    if (value === 'diff') {
      const contentText = getEditorText()
      const dmp = new diff_match_patch()
      const diffBaseTranscript = orderDetails.isTestOrder ? testTranscript : getFormattedTranscript(ctms)
      const diffs = dmp.diff_wordMode(diffBaseTranscript, contentText)
      dmp.diff_cleanupSemantic(diffs)
      setDiff(diffs)
    }
  }

  const getAudioPlayer = useCallback((audioPlayer: HTMLAudioElement | null) => {
    setAudioPlayer(audioPlayer)
  }, [])

  useEffect(() => {
    const fetchWaveform = async () => {
      try {
        const res = await getSignedUrlAction(
          `${orderDetails.fileId}_wf.png`,
          300
        )
        if (res.success && res.signedUrl) {
          setWaveformUrl(res.signedUrl)
        }
      } catch (error) {
        console.error('Failed to load waveform:', error)
      }
    }

    if (orderDetails.fileId) {
      fetchWaveform()
    }
  }, [orderDetails.fileId])

  useEffect(() => {
    const interval = setInterval(async () => {
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
        },
        false
      )
      updateFormattedTranscript()
    }, 1000 * 60 * AUTOSAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [
    getEditorText,
    orderDetails,
    notes,
    step,
    cfd,
    listenCount,
    editedSegments,
  ])

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (!audioPlayer) return

      const currentSecond = Math.floor(audioPlayer.currentTime)

      // Only update stats if we've moved to a new second
      if (currentSecond !== lastTrackedSecondRef.current) {
        lastTrackedSecondRef.current = currentSecond

        setListenCount((prev) => {
          const newListenCount = [...prev]
          const prevCount = newListenCount[currentSecond] || 0
          newListenCount[currentSecond] = prevCount + 1
          return newListenCount
        })
      }
    }

    audioPlayer?.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audioPlayer?.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [audioPlayer])

  const getPlayedPercentage = () => {
    const playedSections = listenCount.filter((count) => count > 0).length
    return Math.round((playedSections / listenCount.length) * 100)
  }

  const getWerPercentage = (): number => {
    const werValue = editorRef.current?.getWer() || 0
    return werValue > 0 && Math.round(werValue * 100) === 0 ? 1 : Math.round(werValue * 100)
  }

  const getBlankPercentage = (): number => {
    const transcript = getEditorText()
    const alignments = editorRef.current?.getAlignments() || []
    return calculateBlankPercentage(transcript, alignments)
  }

  const getEditListenCorrelationPercentage = (): number =>
    calculateEditListenCorrelationPercentage(listenCount, editedSegments)

  const getSpeakerChangePercentage = (): number =>
    calculateSpeakerChangePercentage(
      getFormattedTranscript(ctms),
      getEditorText()
    )

  const getSpeakerMacroF1Score = (): number =>
    calculateSpeakerMacroF1Score(
      getFormattedTranscript(ctms),
      getEditorText()
    )
  
  const getEditorMode = useCallback((editorMode: string) => {
    setEditorMode(editorMode)
  }, [])

  const getEditorModeOptions = async () => {
    try {
      setEditorMode('Manual')
    } catch (error) {
      toast.error('Error fetching editor mode options')
    }
  } //Setting the editor mode to manual for now at cf step

  useEffect(() => {
    if (step !== 'QC' && orderDetails.orderId) {
      getEditorModeOptions()
    }
  }, [orderDetails])

  useEffect(() => {
    if (!orderDetails.orderId || !orderDetails.fileId) return
    if (!initialPDFLoaded && step !== 'QC' && editorMode === 'Editor') {
      regenDocx(
        orderDetails.fileId,
        orderDetails.orderId,
        setButtonLoading,
        setRegenCount,
        setPdfUrl
      )
      setInitialPDFLoaded(true)
    }
  }, [orderDetails, editorMode])

  const updateFormattedTranscript = () => {
    if (!quillRef?.current) return
    const quill = quillRef.current.getEditor()

    // Capture the current selection (cursor position)
    const currentSelection = quill.getSelection()

    const text = quill.getText()
    const formattedDelta = getFormattedContent(text)

    // Update the editor contents with the new delta
    quill.setContents(formattedDelta)

    if(highlightNumbersEnabled && editorRef.current != null) {
      editorRef.current?.highlightNumbers()
    }
    // Restore the original cursor position if it exists
    if (currentSelection) {
      quill.setSelection(currentSelection)
    }
  }

  const getQuillRef = (quillRef: React.RefObject<ReactQuill>) => {
    setQuillRef(quillRef)
  }

  useEffect(() => {
    if (initialEditorData?.notes && notes === '') {
      setNotes(initialEditorData.notes)
    }

    return () => {
      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current);
      }
    }
  }, [initialEditorData?.notes])

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newNotes = e.target.value
      setNotes(newNotes)

      if (notesDebounceRef.current) {
        clearTimeout(notesDebounceRef.current)
      }

      notesDebounceRef.current = setTimeout(() => {
        if (orderDetails.fileId) {
          persistEditorDataIDB(orderDetails.fileId, { notes: newNotes })
        }
      }, 300)
    },
    [orderDetails.fileId]
  )

  const handleFindChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setFindText(text)
    setMatchCount(countMatches(text))
  }

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setReplaceText(text)
  }

  const findHandler = () => {
    searchAndSelectInstance(findText, selection)
  }

  const findPreviousHandler = () => {
    searchAndSelectReverseInstance(findText, selection)
  }

  const replaceOneHandler = () => {
    replaceTextInstance(findText, replaceText, selection)
    setMatchCount(countMatches(findText))
  }

  const replaceAllHandler = () => {
    replaceTextInstance(findText, replaceText, selection, true)
    setMatchCount(countMatches(findText))
  }

  useEffect(() => {
    setMatchCount(countMatches(findText))
  }, [matchSelection, matchCase])

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await getUserEditorSettingsAction()
        if (response.success && response.settings) {
          const newSettings: EditorSettings = {
            wordHighlight: response.settings.wordHighlight,
            fontSize: response.settings.fontSize,
            audioRewindSeconds: response.settings.audioRewindSeconds,
            volume: response.settings.volume,
            playbackSpeed: response.settings.playbackSpeed,
            useNativeContextMenu: response.settings.useNativeContextMenu,
            shortcuts: response.settings.shortcuts,
          }

          setEditorSettings(newSettings)
          setHighlightWordsEnabled(newSettings.wordHighlight)
        }
      } catch (error) {
        toast.error('Failed to load editor settings')
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    setHighlightWordsEnabled(editorSettings.wordHighlight)
  }, [editorSettings])

  const toggleHighlightNumerics = useCallback(() => {
    setHighlightNumbersEnabled(prev => !prev)
  }, [])

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isSubmitting && submissionStatus === 'completed') {
      timer = setInterval(() => {
        setSubmissionCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Close the tab after countdown
            window.close();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSubmitting, submissionStatus]);
  
  return (
    <div className='bg-secondary dark:bg-background h-screen flex flex-col p-1 gap-y-1'>
      <Topbar
        quillRef={quillRef}
        editorModeOptions={editorModeOptions}
        getEditorMode={getEditorMode}
        editorMode={editorMode}
        notes={notes}
        orderDetails={orderDetails}
        setIsSubmitModalOpen={setIsSubmitModalOpen}
        setPdfUrl={setPdfUrl}
        setRegenCount={setRegenCount}
        setFileToUpload={setFileToUpload}
        fileToUpload={fileToUpload}
        listenCount={listenCount}
        editedSegments={editedSegments}
        editorSettings={editorSettings}
        onSettingsChange={setEditorSettings}
        waveformUrl={waveformUrl}
        audioDuration={audioDuration}
        autoCapitalize={autoCapitalize}
        onAutoCapitalizeChange={setAutoCapitalize}
        transcript={initialEditorData?.transcript || ''}
        ctms={ctms}
        editorRef={editorRef}
        step={step}
        cfd={cfd}
      />

      <Header
        getAudioPlayer={getAudioPlayer}
        quillRef={quillRef}
        orderDetails={orderDetails}
        toggleFindAndReplace={toggleFindAndReplace}
        waveformUrl={waveformUrl}
        highlightWordsEnabled={highlightWordsEnabled}
        setHighlightWordsEnabled={setHighlightWordsEnabled}
        fontSize={fontSize}
        setFontSize={setFontSize}
        editorSettings={editorSettings}
        editorRef={editorRef}
        step={step}
        toggleHighlightNumerics={toggleHighlightNumerics}
      />

      <div className='flex h-full overflow-hidden'>
        <div className='flex h-full flex-col items-center flex-1 overflow-hidden'>
          <div
            className={`flex ${
              step !== 'QC' && editorMode === 'Editor'
                ? 'justify-between'
                : 'justify-center'
            } w-full h-full`}
          >
            {step !== 'QC' && editorMode === 'Editor' && (
              <SectionSelector
                selectedSection={selectedSection}
                sectionChangeHandler={sectionChangeHandler}
              />
            )}
            <div className='flex w-full gap-x-1'>
              <div
                className={`bg-background border border-customBorder ${
                  step !== 'QC' && editorMode === 'Editor'
                    ? 'rounded-r-md'
                    : 'rounded-md'
                } w-[80%]`}
              >
                {selectedSection === 'proceedings' &&
                  (orderDetails.orderType === 'FORMATTING' ? (
                    <Tabs value='info' defaultValue='info' className='h-full'>
                      <div className='flex border-b border-customBorder text-md font-medium'>
                        <TabsList className='px-2'>
                          <TabsTrigger
                            className='text-base px-0 pt-2 pb-[6.5px]'
                            value='info'
                          >
                            Info
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <InfoTabComponent orderDetails={orderDetails} />
                    </Tabs>
                  ) : (
                    <Tabs
                      onValueChange={handleTabsValueChange}
                      defaultValue='transcribe'
                      className='h-full'
                    >
                      <div className='flex border-b border-customBorder text-md font-medium'>
                        <TabsList className='px-2 gap-x-7'>
                          <TabsTrigger
                            className='text-base px-0 pt-2 pb-[6.5px]'
                            value='transcribe'
                          >
                            Transcribe
                          </TabsTrigger>
                          <TabsTrigger
                            className='text-base px-0 pt-2 pb-[6.5px]'
                            value='diff'
                          >
                            Diff
                          </TabsTrigger>
                          <TabsTrigger
                            className='text-base px-0 pt-2 pb-[6.5px]'
                            value='info'
                          >
                            Info
                          </TabsTrigger>
                          <TabsTrigger
                            className='text-base px-0 pt-2 pb-[6.5px]'
                            value='speakers'
                          >
                            Speakers
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <EditorTabComponent
                        transcriptLoading={!initialEditorData}
                        ctms={ctms}
                        audioPlayer={audioPlayer}
                        audioDuration={audioDuration}
                        getQuillRef={getQuillRef}
                        orderDetails={orderDetails}
                        setSelectionHandler={setSelectionHandler}
                        selection={selection}
                        searchHighlight={searchHighlight}
                        highlightWordsEnabled={highlightWordsEnabled}
                        setFontSize={setFontSize}
                        setEditedSegments={setEditedSegments}
                        editorSettings={editorSettings}
                        initialEditorData={
                          initialEditorData || {
                            transcript: '',
                            undoStack: [],
                            redoStack: [],
                          }
                        }
                        editorRef={editorRef}
                        step={step}
                        highlightNumbersEnabled={highlightNumbersEnabled}
                        setHighlightNumbersEnabled={setHighlightNumbersEnabled}
                      />

                      <DiffTabComponent diff={diff} />

                      <InfoTabComponent orderDetails={orderDetails} />
                      <SpeakersTabComponent
                        orderDetails={orderDetails}
                        quillRef={quillRef}
                      />
                    </Tabs>
                  ))}
                {selectedSection === 'title' && (
                  <div className='p-2 overflow-y-scroll h-full'>
                    <div>{renderTitleInputs(cfd, setCfd)}</div>
                  </div>
                )}
                {selectedSection === 'case-details' && (
                  <div className='p-2 overflow-y-scroll h-full'>
                    {renderCaseDetailsInputs(cfd, setCfd)}
                  </div>
                )}
                {selectedSection === 'certificates' && (
                  <div className='p-2 overflow-y-scroll h-full'>
                    {renderCertificationInputs(cfd, setCfd)}
                  </div>
                )}
              </div>
              <div className='w-[20%]'>
                <div
                  className={`flex flex-col h-full ${
                    findAndReplaceOpen ? 'gap-y-1' : ''
                  }`}
                >
                  {findAndReplaceOpen && (
                    <div className='bg-background border border-customBorder rounded-md overflow-hidden transition-all duration-200 ease-in-out h-[50%]'>
                      <div className='font-medium text-md border-b border-customBorder flex justify-between items-center p-2'>
                        <span>Find & Replace</span>
                        <button
                          onClick={() => setFindAndReplaceOpen(false)}
                          className='p-1 rounded-md text-muted-foreground hover:bg-secondary transition-colors'
                        >
                          <Cross1Icon className='h-4 w-4' />
                        </button>
                      </div>
                      <div className='space-y-3 px-2 py-[10px] h-[calc(100%-41px)] overflow-y-auto'>
                        <div className='relative'>
                          <Input
                            placeholder='Find...'
                            value={findText}
                            onChange={handleFindChange}
                            ref={findInputRef}
                          />
                          {findText && (
                            <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>
                              {matchCount} matches
                            </span>
                          )}
                        </div>
                        <Input
                          placeholder='Replace with...'
                          value={replaceText}
                          onChange={handleReplaceChange}
                        />
                        <div className='flex gap-4'>
                          <Label className='flex items-center space-x-2'>
                            <Checkbox
                              checked={matchCase}
                              onCheckedChange={(checked) =>
                                setMatchCase(checked === true)
                              }
                            />
                            <span>Match case</span>
                          </Label>
                          <Label className='flex items-center space-x-2'>
                            <Checkbox
                              checked={matchSelection}
                              onCheckedChange={(checked) =>
                                setMatchSelection(checked === true)
                              }
                            />
                            <span>Selection</span>
                          </Label>
                        </div>
                        <div className='flex flex-col w-full gap-2'>
                          <div
                            className='inline-flex w-full rounded-md'
                            role='group'
                          >
                            <button
                              onClick={findPreviousHandler}
                              className='flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-l-3xl rounded-r-none border-r-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => {
                                findHandler()
                              }}
                              className='flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-r-3xl rounded-l-none border-l border-white/20 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
                            >
                              Next
                            </button>
                          </div>
                          <div
                            className='inline-flex w-full rounded-md'
                            role='group'
                          >
                            <button
                              onClick={replaceOneHandler}
                              className='flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-l-3xl rounded-r-none border-r-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
                            >
                              Replace
                            </button>
                            <button
                              onClick={replaceAllHandler}
                              className='flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-r-3xl rounded-l-none border-l border-white/20 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
                            >
                              Replace All
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={`bg-background border border-customBorder rounded-md overflow-hidden transition-all duration-200 ease-in-out ${
                      findAndReplaceOpen ? 'h-[50%]' : 'h-full'
                    }`}
                  >
                    <div className='font-medium text-md border-b border-customBorder flex items-center p-2'>
                      Notes
                    </div>
                    <div className='h-[calc(100%-41px)] overflow-hidden'>
                      <Textarea
                        placeholder='Start typing...'
                        className='py-[10px] px-2 resize-none h-full w-full border-none outline-none focus:outline-none focus-visible:ring-0 shadow-none'
                        value={notes}
                        onChange={handleNotesChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {step !== 'QC' && editorMode === 'Editor' && (
              <div className='bg-background w-[20%] rounded-md border border-customBorder overflow-hidden p-2 ml-1'>
                <div className='overflow-y-scroll h-full'>
                  <RenderPDFDocument key={regenCount} file={pdfUrl} />
                </div>
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={isSubmitModalOpen}
          onOpenChange={(open) => setIsSubmitModalOpen(open)}
        >
          <DialogContent
            className={
              orderDetails.orderType !== 'FORMATTING' ? 'max-w-4xl' : ''
            }
          >
            <DialogHeader>
              <DialogTitle>Submit</DialogTitle>
              <DialogDescription>
                Please confirm that you want to submit the file
              </DialogDescription>

              {orderDetails.orderType !== 'FORMATTING' && (
                <div className='pt-4'>
                  <p className='text-sm text-muted-foreground/80 mb-2'>
                    Audio Playback Coverage:{' '}
                    <span className='font-medium'>
                      {getPlayedPercentage()}%
                    </span>
                  </p>
                  <WaveformHeatmap
                    waveformUrl={waveformUrl}
                    listenCount={listenCount}
                    editedSegments={editedSegments}
                    duration={audioDuration}
                  />
                </div>
              )}

              {orderDetails.status === 'FINALIZER_ASSIGNED' && (
                <div className='pt-4'>
                  <Label
                    htmlFor='finalizer-comment'
                    className='text-sm text-gray-500'
                  >
                    Comments for CF reviewer:
                  </Label>
                  <div className='h-2' />
                  <Textarea
                    value={finalizerComment}
                    onChange={(e) => {
                      setFinalizerComment(e.target.value)
                    }}
                    id='finalizer-comment'
                    placeholder='Comments for CF reviewer...'
                  />
                </div>
              )}

              {step === 'QC' &&
                !['OM', 'ADMIN'].includes(session?.user?.role || '') && (
                  <div className='pt-4'>
                    <SubmissionValidation
                      playedPercentage={getPlayedPercentage()}
                      werPercentage={getWerPercentage()}
                      blankPercentage={getBlankPercentage()}
                      editListenCorrelationPercentage={getEditListenCorrelationPercentage()}
                      speakerChangePercentage={getSpeakerChangePercentage()}
                      setIsQCValidationPassed={setIsQCValidationPassed}
                    />
                  </div>
                )}

              <div className='flex justify-end gap-2 pt-4'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setIsSubmitModalOpen(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setButtonLoading((prevButtonLoading) => ({
                        ...prevButtonLoading,
                        submit: true,
                      }))

                      setIsSubmitModalOpen(false)
                      setIsSubmitting(true)
                      setSubmissionStatus('processing')

                      if (orderDetails.orderType === 'FORMATTING') {
                        await handleSubmit({
                          orderDetails,
                          step,
                          editorMode,
                          fileToUpload,
                          getPlayedPercentage,
                          router,
                          finalizerComment,
                        })
                      } else {
                        if (!quillRef?.current) return
                        const quill = quillRef.current.getEditor()

                        let currentAlignments: AlignmentType[] = []
                        if (editorRef.current && step === 'QC') {
                          await editorRef.current.triggerAlignmentUpdate()
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
                          },
                          false
                        )

                        await handleSubmit({
                          orderDetails,
                          step,
                          editorMode,
                          fileToUpload,
                          getPlayedPercentage,
                          router,
                          quill,
                          finalizerComment,
                          currentAlignments,
                          qcValidation: {
                            isValidationPassed: isQCValidationPassed,
                            playedPercentage: getPlayedPercentage(),
                            werPercentage: getWerPercentage(),
                            blankPercentage: getBlankPercentage(),
                            editListenCorrelationPercentage:
                              getEditListenCorrelationPercentage(),
                            speakerChangePercentage: getSpeakerChangePercentage(),
                            speakerMacroF1Score: getSpeakerMacroF1Score(),
                          },
                        })                        
                      }
                      
                      setSubmissionStatus('completed')
                    } catch (error) {
                      setButtonLoading((prevButtonLoading) => ({
                        ...prevButtonLoading,
                        submit: false,
                      }));
                      setIsSubmitting(false);
                      setSubmissionStatus('processing');
                    } finally {
                      setButtonLoading((prevButtonLoading) => ({
                        ...prevButtonLoading,
                        submit: false,
                      }));
                    }
                  }}
                  disabled={buttonLoading.submit}
                >
                  {buttonLoading.submit && (
                    <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                  )}
                  Confirm
                </Button>
              </div>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Setting up transcript loader */}
        <Dialog open={isSettingTest} modal >
          <DialogContent className="max-w-md p-8 flex flex-col items-center justify-center [&>button]:hidden">
            <div className="flex flex-col items-center space-y-4">
              <ReloadIcon className="h-8 w-8 animate-spin text-primary" />
              <DialogTitle className="text-center">Setting up the test</DialogTitle>
              <DialogDescription className="text-center">
                Please wait while we prepare your test.
              </DialogDescription>
            </div>
          </DialogContent>
        </Dialog>

        {/* Update the Submission Processing Modal */}
        <Dialog open={isSubmitting} modal>
          <DialogContent className="max-w-md p-8 flex flex-col items-center justify-center [&>button]:hidden">
            <div className="flex flex-col items-center space-y-4">
              {submissionStatus === 'processing' ? (
                <>
                  <ReloadIcon className="h-8 w-8 animate-spin text-primary" />
                  <DialogTitle className="text-center">Submitting Transcript</DialogTitle>
                  <DialogDescription className="text-center">
                    Please wait while we process your submission...
                  </DialogDescription>
                </>
              ) : (
                <>
                  <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="h-5 w-5 text-white" />
                  </div>
                  <DialogTitle className="text-center">Submission Complete</DialogTitle>
                  <DialogDescription className="text-center">
                    Your transcript has been submitted successfully. 
                    This window will close in {submissionCountdown} seconds.
                  </DialogDescription>
                </>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => window.close()} disabled={submissionStatus === 'processing'}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default EditorPage
