'use client'

import { Cross1Icon, ReloadIcon } from '@radix-ui/react-icons'
import { Change, diffWords } from 'diff'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useCallback, useEffect, useState, useMemo } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import { spellcheckAction } from '@/app/actions/editor/spellcheck'
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
import { LineData } from '@/components/editor/transcriptUtils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { RenderPDFDocument } from '@/components/utils'
import { AUTOSAVE_INTERVAL } from '@/constants'
import usePreventMultipleTabs from '@/hooks/usePreventMultipleTabs'
import {
  ShortcutControls,
  useShortcuts,
} from '@/utils/editorAudioPlayerShortcuts'
import {
  ConvertedASROutput,
  updatePlayedPercentage,
  regenDocx,
  fetchFileDetails,
  handleSave,
  handleSubmit,
  replaceTextHandler,
  searchAndSelect,
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
  const [ctms, setCtms] = useState<ConvertedASROutput[]>([])
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

  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [lastSearchIndex, setLastSearchIndex] = useState<number>(-1)
  const [replaceMisspelledWord, setReplaceMisspelledWord] = useState<string>('')
  const [spellcheckOpen, setSpellcheckOpen] = useState(false)
  const [spellcheckValue, setSpellCheckValue] = useState<
    { word: string; suggestions: string[] }[]
  >([])
  const [content, setContent] = useState<{ insert: string }[]>([])
  const [lines, setLines] = useState<LineData[]>([])
  interface PlayerEvent {
    t: number
    s: number
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

  const shortcutControls = useMemo(() => {
    const controls: Partial<ShortcutControls> = {
      saveChanges: () =>
        handleSave({
          getEditorText,
          orderDetails,
          notes,
          cfd,
          setButtonLoading,
          lines,
          playerEvents,
        }),
    }
    return controls as ShortcutControls
  }, [getEditorText, orderDetails, notes, step, cfd, setButtonLoading])

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

    const file = localStorage.getItem(orderDetails?.fileId as string)
    if (file) {
      setNotes(JSON.parse(file).notes)
    }
  }, [])

  const handleTabChange = () => {
    //TODO: Fix this
    const diff = diffWords(transcript, content[0].insert)
    setDiff(diff)
  }

  const getAudioPlayer = (audioPlayer: HTMLAudioElement | null) => {
    setAudioPlayer(audioPlayer)
  }

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
          lines,
          playerEvents,
        },
        false
      )
    }, 1000 * 60 * AUTOSAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [getEditorText, orderDetails, notes, step, cfd, lines])

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

  const replaceTextInstance = (
    findText: string,
    replaceText: string,
    replaceAll = false
  ) => {
    if (!quillRef?.current) return
    const quill = quillRef.current.getEditor()
    replaceTextHandler(quill, findText, replaceText, replaceAll, false, toast)
  }

  const searchAndSelectInstance = (searchText: string) => {
    if (!quillRef?.current) return
    const quill = quillRef.current.getEditor()
    searchAndSelect(
      quill,
      searchText,
      false,
      lastSearchIndex,
      setLastSearchIndex,
      toast
    )
  }

  const toggleSpellcheck = async () => {
    if (!quillRef?.current) return
    let toastId
    try {
      if (!spellcheckValue.length) {
        toastId = toast.loading('Running spellcheck...')
        const transcript = quillRef?.current?.getEditor().getText()
        const response = await spellcheckAction(transcript)
        if (response.success && response.data) {
          setSpellCheckValue(
            response.data.filter(
              (word: { word: string; suggestions: string[] }) =>
                word.suggestions.length > 0
            )
          )
          searchAndSelectInstance(response.data[0].word)
          toast.dismiss(toastId)
          toastId = toast.success('Spellcheck completed successfully')
          toast.dismiss(toastId)
        } else {
          toast.dismiss(toastId)
          toast.error('Failed to run spellcheck')
        }
      }
      setSpellcheckOpen(!spellcheckOpen)
      if (submitting && spellcheckOpen) {
        setIsSubmitModalOpen(true)
        setSubmitting(false)
      }
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to run spellcheck')
    }
  }

  const handleSpellcheckAction = (action: string) => {
    if (!spellcheckValue.length) {
      setIsSubmitModalOpen(true)
      setSpellcheckOpen(false)
      return
    }

    const currentWord = spellcheckValue[0].word

    if (action === 'ignoreOnce') {
      // Remove the current word instance
      const newSpellcheckValue = [...spellcheckValue]
      newSpellcheckValue.shift()
      setSpellCheckValue(newSpellcheckValue)
      setReplaceMisspelledWord('')

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false)
        setIsSubmitModalOpen(true)
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `)
      }
    }

    if (action === 'ignoreAll') {
      // Remove all instances of the current word
      const newSpellcheckValue = spellcheckValue.filter(
        (item) => item.word !== currentWord
      )
      setSpellCheckValue(newSpellcheckValue)
      setReplaceMisspelledWord('')

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false)
        setIsSubmitModalOpen(true)
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `)
      }
    }

    if (action === 'changeOnce') {
      if (!replaceMisspelledWord)
        return toast.error('Please enter a word to replace')

      // Replace current instance and remove from array
      searchAndSelectInstance(` ${currentWord} `)
      replaceTextInstance(` ${currentWord} `, ` ${replaceMisspelledWord} `)

      const newSpellcheckValue = [...spellcheckValue]
      newSpellcheckValue.shift()
      setSpellCheckValue(newSpellcheckValue)
      setReplaceMisspelledWord('')

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false)
        setIsSubmitModalOpen(true)
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `)
      }
    }

    if (action === 'changeAll') {
      if (!replaceMisspelledWord)
        return toast.error('Please enter a word to replace')

      // Replace all instances and remove all occurrences from array
      replaceTextInstance(
        ` ${currentWord} `,
        ` ${replaceMisspelledWord} `,
        true
      )
      const newSpellcheckValue = spellcheckValue.filter(
        (item) => item.word !== currentWord
      )
      setSpellCheckValue(newSpellcheckValue)
      setReplaceMisspelledWord('')

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false)
        setIsSubmitModalOpen(true)
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `)
      }
    }
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

    updateRemainingTime()

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [orderDetails])

  const getLines = (lineData: LineData[]) => {
    setLines(lineData)
  }

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setNotes(text)
  }

  return (
    <div className='bg-[#F7F5FF] h-screen flex flex-col overflow-hidden'>
      <div className='mx-2'>
        <div className='flex justify-between bg-white rounded-t-2xl'>
          <p className='font-semibold px-2'>{orderDetails.filename}</p>
          {session?.user?.role !== 'CUSTOMER' && (
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
        toggleSpellCheck={toggleSpellcheck}
        setSubmitting={setSubmitting}
        lines={lines}
        playerEvents={playerEvents}
        setPdfUrl={setPdfUrl}
        setRegenCount={setRegenCount}
        setFileToUpload={setFileToUpload}
        fileToUpload={fileToUpload}
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
                      <div className='flex bg-white border border-gray-200 rounded-t-2xl px-4 text-md font-medium h-12'>
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
                        getLines={getLines}
                        setContent={setContent}
                        orderDetails={orderDetails}
                        transcript={transcript}
                        ctms={ctms}
                        audioPlayer={audioPlayer}
                        audioDuration={audioDuration}
                        getQuillRef={getQuillRef}
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
                  <div className='fixed w-[19%] h-[84%] bg-white ml-2 overflow-auto py-4 px-3 rounded-lg overflow-y-hidden border'>
                    <div className='border-b flex justify-between items-center pb-1'>
                      <p className='text-lg font-semibold'>Notes</p>
                    </div>
                    <Textarea
                      placeholder='Start typing...'
                      className='resize-none mt-3 h-[94%] border-none outline-none focus:outline-none focus-visible:ring-0 shadow-none'
                      value={notes}
                      onChange={handleNotesChange}
                    />
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
        {spellcheckOpen && (
          <div
            className='fixed bg-white z-[1000] overflow-auto py-4 px-4 rounded-lg shadow-lg overflow-y-hidden border'
            style={{
              top: `${position.y}px`,
              left: `${position.x}px`,
              width: '500px',
            }}
          >
            <div
              onMouseDown={handleDragChange}
              className='cursor-move border-b flex justify-between items-center pb-2'
            >
              <p className='text-lg font-semibold'>Spellcheck</p>
              <button
                onClick={toggleSpellcheck}
                className='cursor-pointer hover:bg-gray-100 p-2 rounded-lg'
              >
                <Cross1Icon />
              </button>
            </div>
            <div className='mt-4 max-h-[400px] overflow-y-auto'>
              {spellcheckValue && spellcheckValue.length > 0 && (
                <div>
                  <p className='font-semibold mb-2'>
                    Misspelled: {spellcheckValue[0].word}
                  </p>
                  <div className='flex flex-col'>
                    {spellcheckValue[0].suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setReplaceMisspelledWord(suggestion)}
                        className={`text-left py-1 px-2 hover:bg-gray-100 rounded ${replaceMisspelledWord === suggestion
                          ? 'bg-blue-100'
                          : ''
                          }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className='mt-4 flex justify-between'>
              <Button onClick={() => handleSpellcheckAction('ignoreOnce')}>
                Ignore Once
              </Button>
              <Button onClick={() => handleSpellcheckAction('ignoreAll')}>
                Ignore All
              </Button>
              <Button onClick={() => handleSpellcheckAction('changeOnce')}>
                Change Once
              </Button>
              <Button onClick={() => handleSpellcheckAction('changeAll')}>
                Change All
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPage