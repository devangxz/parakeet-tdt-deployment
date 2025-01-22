'use client'

import { Cross1Icon, ReloadIcon } from '@radix-ui/react-icons'
import { Change, diffWords } from 'diff'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Op } from 'quill/core'
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import renderCaseDetailsInputs from '@/components/editor/CaseDetailsInput'
import renderCertificationInputs from '@/components/editor/CertificationInputs'
import Header from '@/components/editor/Header'
import SectionSelector from '@/components/editor/SectionSelector'
import {
  DiffTabComponent,
  EditorTabComponent,
  InfoTabComponent,
} from '@/components/editor/TabComponents'
import { Tabs, TabsList, TabsTrigger } from '@/components/editor/Tabs'
import renderTitleInputs from '@/components/editor/TitleInputs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RenderPDFDocument } from '@/components/utils'
import { AUTOSAVE_INTERVAL } from '@/constants'
import usePreventMultipleTabs from '@/hooks/usePreventMultipleTabs'
import {
  ShortcutControls,
  useShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  CTMType,
  updatePlayedPercentage,
  regenDocx,
  fetchFileDetails,
  handleSave,
  handleSubmit,
  searchAndSelect,
  replaceTextHandler,
  CustomerQuillSelection,
  autoCapitalizeSentences,
} from '@/utils/editorUtils'

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
  })
  const [cfd, setCfd] = useState('')
  const [notes, setNotes] = useState('')
  const params = useParams()
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
  const [diff, setDiff] = useState<Change[]>([])
  const [transcript, setTranscript] = useState('')
  const [ctms, setCtms] = useState<CTMType[]>([])
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null)
  const [step, setStep] = useState<string>('')
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeoutCount, setTimeoutCount] = useState('')
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

  const [content, setContent] = useState<Op[]>([])
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [lastSearchIndex, setLastSearchIndex] = useState<number>(-1)
  const [findAndReplaceOpen, setFindAndReplaceOpen] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [matchSelection, setMatchSelection] = useState(false)
  const findInputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<CustomerQuillSelection | null>(null)
  const [searchHighlight, setSearchHighlight] = useState<{ index: number; length: number } | null>(null);
  const [highlightWordsEnabled, setHighlightWordsEnabled] = useState(true);

  interface PlayerEvent {
    t: number
    s: number
  }

  const setSelectionHandler = () => {
    const quill = quillRef?.current?.getEditor()
    if (!quill) return
    const range = quill.getSelection()
    if (range) {
      setSelection({ index: range.index, length: range.length })
    }
  }

  const [playerEvents, setPlayerEvents] = useState<PlayerEvent[]>([])

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

  const searchAndSelectInstance = (searchText: string, selection: {
    index: number
    length: number
  } | null) => {
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

  const searchAndSelectReverseInstance = (searchText: string, selection: {
    index: number
    length: number
  } | null) => {
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
    setFindAndReplaceOpen(prev => !prev)
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

      saveChanges: () => {
        autoCapitalizeSentences(quillRef)
        handleSave({
          getEditorText,
          orderDetails,
          notes,
          cfd,
          setButtonLoading,
          playerEvents,
        })
      }

    }
    return controls as ShortcutControls
  }, [getEditorText, orderDetails, notes, step, cfd, setButtonLoading, findText, replaceText, matchCase, lastSearchIndex])

  useShortcuts(shortcutControls)

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.addEventListener('loadedmetadata', () => {
        setAudioDuration(audioPlayer.duration)
      })
    }
  }, [audioPlayer])

  const sectionChangeHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.dataset.value
    if (!value) return
    setSelectedSection(value)
  }

  useEffect(() => {
    if (!session || !session.user) return

    const ALLOWED_ROLES = ['QC', 'REVIEWER', 'ADMIN', 'OM', 'CUSTOMER']

    if (!ALLOWED_ROLES.includes(session.user.role)) {
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

    fetchFileDetails({
      params,
      setOrderDetails,
      setCfd,
      setStep,
      setTranscript,
      setCtms,
      setPlayerEvents,
    })
  }, [])

  const handleTabChange = () => {
    const contentText = content.map(op =>
      typeof op.insert === 'string' ? op.insert : ''
    ).join('')
    const diff = diffWords(transcript, contentText)
    setDiff(diff)
  }

  const getAudioPlayer = useCallback((audioPlayer: HTMLAudioElement | null) => {
    setAudioPlayer(audioPlayer)
  }, [])

  const [audioPlayed, setAudioPlayed] = useState(new Set<number>())
  const [playedPercentage, setPlayedPercentage] = useState(0)

  useEffect(() => {
    const interval = setInterval(async () => {
      await handleSave(
        {
          getEditorText,
          orderDetails,
          notes,
          cfd,
          setButtonLoading,
          playerEvents,
        },
        false
      )
    }, 1000 * 60 * AUTOSAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [getEditorText, orderDetails, notes, step, cfd])

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (!audioPlayer) return
      const currentTime = Math.floor(audioPlayer.currentTime)
      setAudioPlayed((prev) => new Set(prev.add(currentTime)))
      updatePlayedPercentage(audioPlayer, audioPlayed, setPlayedPercentage)
      // Cast target to HTMLAudioElement to access currentTime
      // const target = e.target as HTMLAudioElement //TODO: Implement this
      // setPlayerEvents(prev => [...prev, { t: (new Date()).getTime(), s: target.currentTime }])
    }

    const handlePlayEnd = () => {
      updatePlayedPercentage(audioPlayer, audioPlayed, setPlayedPercentage)
    }

    audioPlayer?.addEventListener('timeupdate', handleTimeUpdate)
    audioPlayer?.addEventListener('ended', handlePlayEnd)

    return () => {
      audioPlayer?.removeEventListener('timeupdate', handleTimeUpdate)
      audioPlayer?.removeEventListener('ended', handlePlayEnd)
    }
  }, [audioPlayer, audioPlayed])

  const getPlayedPercentage = () => playedPercentage

  const getEditorMode = useCallback((editorMode: string) => {
    setEditorMode(editorMode)
  }, [])

  const getEditorModeOptions = async () => {
    try {
      // const response = await axiosInstance.get(`${BACKEND_URL}/get-options/${orderDetails.orderId}`);
      setEditorMode('Manual')
      // setEditorModeOptions(response.data.options);
    } catch (error) {
      toast.error('Error fetching editor mode options')
    }
  } //Setting the editor mode to manual for now at cf step

  useEffect(() => {
    if (step !== 'QC' && orderDetails.orderId) {
      getEditorModeOptions()
    }

    const file = localStorage.getItem(orderDetails?.fileId as string)
    if (file) {
      setNotes(JSON.parse(file).notes)
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

  const getQuillRef = (quillRef: React.RefObject<ReactQuill>) => {
    setQuillRef(quillRef)
  }

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

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setNotes(text)

    localStorage.setItem(orderDetails.fileId, JSON.stringify({ notes: text }))
  }

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

  return (
    <div className='bg-[#F7F5FF] h-screen flex flex-col overflow-hidden'>
      <div className="mx-2 mt-2">
        <div className='flex justify-between bg-white rounded-t-lg'>
          <p className='font-semibold px-2'>{orderDetails.filename}</p>
          {orderDetails.status === 'QC_ASSIGNED' && (
            <span
              className={`text-red-600 ${orderDetails.remainingTime === '0' ? 'animate-pulse' : ''
                } mr-2`}
            >
              {timeoutCount}
            </span>
          )}
        </div>
      </div>
      <Header
        getAudioPlayer={getAudioPlayer}
        quillRef={quillRef}
        editorMode={editorMode}
        editorModeOptions={editorModeOptions}
        getEditorMode={getEditorMode}
        notes={notes}
        orderDetails={orderDetails}
        submitting={submitting}
        setIsSubmitModalOpen={setIsSubmitModalOpen}
        setSubmitting={setSubmitting}
        playerEvents={playerEvents}
        setPdfUrl={setPdfUrl}
        setRegenCount={setRegenCount}
        setFileToUpload={setFileToUpload}
        fileToUpload={fileToUpload}
        toggleFindAndReplace={toggleFindAndReplace}
        highlightWordsEnabled={highlightWordsEnabled}
        setHighlightWordsEnabled={setHighlightWordsEnabled}
      />
      <div className='flex flex-col flex-1 overflow-hidden'>
        <div className='flex justify-between px-16 mt-2 flex-shrink-0'></div>
        <div className='flex flex-col items-center flex-1 overflow-hidden'>
          <div
            className={`flex ${step !== 'QC' && editorMode === 'Editor'
              ? 'justify-between'
              : 'justify-center'
              } px-3 h-full`}
          >
            {step !== 'QC' && editorMode === 'Editor' && (
              <SectionSelector
                selectedSection={selectedSection}
                sectionChangeHandler={sectionChangeHandler}
              />
            )}
            <div className='flex flex-col justify-between h-full'>
              <div className='flex w-[100vw] px-2 h-full'>
                <div className='w-4/5 h-full pb-12'>
                  {selectedSection === 'proceedings' && (
                    <Tabs
                      onValueChange={handleTabChange}
                      defaultValue='transcribe'
                      className='h-full'
                    >
                      <div className='flex bg-white border border-gray-200 rounded-t-lg text-md font-medium h-12'>
                        <TabsList>
                          <TabsTrigger className='text-base' value='transcribe'>
                            Transcribe
                          </TabsTrigger>
                          <TabsTrigger className='text-base' value='diff'>
                            Diff
                          </TabsTrigger>
                          <TabsTrigger className='text-base' value='info'>
                            Info
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <EditorTabComponent
                        content={content}
                        setContent={setContent}
                        orderDetails={orderDetails}
                        transcript={transcript}
                        ctms={ctms}
                        audioPlayer={audioPlayer}
                        audioDuration={audioDuration}
                        getQuillRef={getQuillRef}
                        setSelectionHandler={setSelectionHandler}
                        selection={selection}
                        searchHighlight={searchHighlight}
                        highlightWordsEnabled={highlightWordsEnabled}
                      />

                      <DiffTabComponent diff={diff} />

                      <InfoTabComponent orderDetails={orderDetails} />
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
                <div className='w-1/5'>
                  <div className={`fixed w-[19%] ${findAndReplaceOpen ? 'h-[83%]' : 'h-[84%]'} flex flex-col ${findAndReplaceOpen ? 'gap-2' : ''} ml-2`}>
                    <div
                      className={`bg-white rounded-lg border overflow-hidden transition-all duration-200 ease-in-out ${findAndReplaceOpen ? 'opacity-100 translate-y-0 h-[49%]' : 'opacity-0 -translate-y-4 pointer-events-none h-0 m-0'}`}>
                      <div className='px-4 py-3 font-medium text-base border-b flex justify-between items-center'>
                        <span>Find & Replace</span>
                        <button
                          onClick={() => setFindAndReplaceOpen(false)}
                          className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                          <Cross1Icon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className='px-4 py-8 space-y-4'>
                        <div className="relative">
                          <Input
                            placeholder='Find...'
                            value={findText}
                            onChange={handleFindChange}
                            ref={findInputRef}
                          />
                          {findText && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
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
                              onCheckedChange={(checked) => setMatchCase(checked === true)}
                            />
                            <span>Match case</span>
                          </Label>
                          <Label className='flex items-center space-x-2'>
                            <Checkbox
                              checked={matchSelection}
                              onCheckedChange={(checked) => setMatchSelection(checked === true)}
                            />
                            <span>Selection</span>
                          </Label>
                        </div>
                        <div className="flex flex-col w-full gap-2">
                          <div className='inline-flex w-full rounded-md' role="group">
                            <button
                              onClick={findPreviousHandler}
                              className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-l-3xl rounded-r-none border-r-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => {
                                findHandler();
                              }}
                              className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-r-3xl rounded-l-none border-l border-white/20 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                          <div className='inline-flex w-full rounded-md' role="group">
                            <button
                              onClick={replaceOneHandler}
                              className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-l-3xl rounded-r-none border-r-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                              Replace
                            </button>
                            <button
                              onClick={replaceAllHandler}
                              className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-r-3xl rounded-l-none border-l border-white/20 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            >
                              Replace All
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`bg-white rounded-lg border overflow-hidden transition-all duration-200 ease-in-out ${findAndReplaceOpen ? 'h-[49%]' : 'h-[98%]'}`}>
                      <div className='px-4 font-medium h-12 text-base border-b flex items-center'>
                        Notes
                      </div>
                      <div className='pt-4 pb-6 px-1 h-[calc(100%-48px)]'>
                        <Textarea
                          placeholder='Start typing...'
                          className='resize-none h-full w-full border-none outline-none focus:outline-none focus-visible:ring-0 shadow-none mb-2'
                          value={notes}
                          onChange={handleNotesChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
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

        <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit</DialogTitle>
              <DialogDescription>
                Please confirm that you want to submit the transcript
              </DialogDescription>
              <Button
                onClick={() => {
                  if (!quillRef?.current) return
                  const quill = quillRef.current.getEditor()
                  handleSubmit({
                    orderDetails,
                    step,
                    editorMode,
                    fileToUpload,
                    setButtonLoading,
                    getPlayedPercentage,
                    router,
                    quill,
                  })
                  setSubmitting(false)
                  setIsSubmitModalOpen(false)
                }}
                disabled={buttonLoading.submit}
                className='ml-2'
              >
                {' '}
                {buttonLoading.submit && (
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                )}{' '}
                Confirm
              </Button>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default EditorPage
