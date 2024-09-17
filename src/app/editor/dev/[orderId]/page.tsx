'use client'

import { ClockIcon, ReloadIcon, TextAlignLeftIcon, ThickArrowLeftIcon, ThickArrowRightIcon } from '@radix-ui/react-icons'
import { Change, diffWords } from 'diff'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useCallback, useEffect, useState } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import ActionButton from '@/components/editor/ActionButton'
import renderCaseDetailsInputs from '@/components/editor/CaseDetailsInput'
import renderCertificationInputs from '@/components/editor/CertificationInputs'
import DownloadDocxDialog from '@/components/editor/DownloadDocxDialog'
import NewAudioPlayer from '@/components/editor/NewAudioPlayer'
import NewHeader from '@/components/editor/NewHeader'
import ReportDialog from '@/components/editor/ReportDialog'
import SectionSelector from '@/components/editor/SectionSelector'
import { DiffTabComponent, EditorTabComponent, InfoTabComponent, SpeakerNameTabComponent } from '@/components/editor/TabComponents'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/editor/Tabs'
import renderTitleInputs from '@/components/editor/TitleInputs'
import { CTMSWord } from '@/components/editor/transcriptUtils'
import UploadDocxDialog from '@/components/editor/UploadDocxDialog'
import UploadTextFile from '@/components/editor/UploadTextFile'
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
import { RenderPDFDocument } from '@/components/utils'
import { MINIMUM_AUDIO_PLAYBACK_PERCENTAGE } from '@/constants'
import {
  ConvertedASROutput,
  updatePlayedPercentage,
  downloadEditorDocxFile,
  downloadEditorTextFile,
  downloadMP3,
  regenDocx,
  convertSecondsToTimestamp,
  fetchFileDetails,
  handleSave,
  handleSubmit,
  adjustTimestamps,
  navigateAndPlayBlanks,
  playCurrentParagraphTimestamp,
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
}

export type UploadFilesType = {
  files: FileList
  type: string
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

export type ShortcutControls = PlayerControls & {
  searchWordUnderCursor: () => void // Example for extending the type
  correctSpelling: () => void
  insertTimestamps: () => void
  insertSpeakerName: () => void
  playWord: () => void
  nextPage: () => void
  prevPage: () => void
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
  })
  const [cfd, setCfd] = useState('')
  const [notes, setNotes] = useState('')
  const params = useParams()
  const router = useRouter()
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
  const { data: session } = useSession()
  const [diff, setDiff] = useState<Change[]>([])
  const [transcript, setTranscript] = useState('')
  const [ctms, setCtms] = useState<ConvertedASROutput[]>([])
  const [updatedCtms, setUpdatedCtms] = useState<CTMSWord[]>([])
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null)
  const [step, setStep] = useState<string>('')
  const [spellcheckModal, setSpellcheckModal] = useState(false)
  const [selection, setSelection] = useState<{ index: number; length: number } | null>(null);
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

  const [adjustTimestampsBy, setAdjustTimestampsBy] = useState('0')
  const [audioDuration, setAudioDuration] = useState(1)
  const [quillRef, setQuillRef] = useState<React.RefObject<ReactQuill>>()
  const [disableGoToWord, setDisableGoToWord] = useState(false);

  const playNextBlankInstance = () => {
    const quill = quillRef?.current?.getEditor();
    if (!quill) return;
    return navigateAndPlayBlanks.bind(null, quill, audioPlayer, setDisableGoToWord)
  }

  const playPreviousBlankInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor();
    if (!quill) return;
    return navigateAndPlayBlanks.bind(null, quill, audioPlayer, setDisableGoToWord, true)
  }, [audioPlayer, quillRef])

  const playCurrentParagraphInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor();
    if (!quill) return;
    return playCurrentParagraphTimestamp.bind(null, quill, audioPlayer, setDisableGoToWord)
  }, [audioPlayer, quillRef])

  const adjustTimestampsInstance = useCallback(() => {
    const quill = quillRef?.current?.getEditor();
    if (!quill) return;
    return adjustTimestamps(quill, updatedCtms, setUpdatedCtms, Number(adjustTimestampsBy), selection)
  }, [audioPlayer, quillRef, updatedCtms, adjustTimestampsBy])

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.addEventListener('loadedmetadata', () => {
        setAudioDuration(audioPlayer.duration);
      });
    }
  }, [audioPlayer]);

  // useEffect(() => {
  //   let keysPressed: string[] = []
  //   const handleKeyDown = (event: KeyboardEvent) => {
  //     keysPressed.push(event.key)
  //     if (
  //       event.ctrlKey &&
  //       event.shiftKey &&
  //       keysPressed.includes('Q') &&
  //       keysPressed.includes('Z') &&
  //       keysPressed.includes('X')
  //     ) {
  //       setDisableAudioPlayCheck(true)
  //       toast.info('Audio play check disabled')
  //     }
  //   }

  //   const handleKeyUp = () => {
  //     keysPressed = []
  //   }

  //   editorRef?.current?.addEventListener('keydown', (event) => {
  //     if (event.ctrlKey || event.altKey) {
  //       event.preventDefault()
  //     }

  // if (event.altKey && event.ctrlKey && event.code === 'KeyU') {
  //   const selection = window.getSelection()
  //   if (selection && selection.rangeCount > 0) {
  //     const range = selection.getRangeAt(0)
  //     const startNode = range.startContainer
  //     const endNode = range.endContainer

  //     let cap = false
  //     editorRef?.current?.childNodes.forEach((node) => {
  //       if (node.firstChild === startNode) {
  //         cap = true
  //       }

  //       if (node.firstChild === endNode) {
  //         cap = false
  //       }

  //       if (cap) {
  //         if (node.firstChild && node.firstChild.textContent) {
  //           node.firstChild.textContent =
  //             node.firstChild.textContent[0].toUpperCase() +
  //             node.firstChild.textContent.slice(1)
  //         }
  //       }
  //     })
  //   }
  // }

  // if (event.altKey && event.code === 'KeyS') {
  //   const selection = window.getSelection()
  //   if (selection && selection.rangeCount > 0) {
  //     const range = selection.getRangeAt(0)
  //     const indexNode = range.startContainer

  //     window.open(
  //       'https://www.google.com/search?q=' + indexNode.textContent,
  //       '_blank',
  //       [
  //         'titlebar=no',
  //         'location=no',
  //         'menubar=no',
  //         'toolbar=no',
  //         'status=no',
  //         'scrollbars=no',
  //         'resizeable=no',
  //         'top=0',
  //         'left=0',
  //         'height=' + window.screen.availHeight / 2,
  //         'width=' + window.screen.availWidth / 2,
  //       ].join(',')
  //     )
  //   }
  // }

  // if (event.ctrlKey && event.code === 'KeyT') {
  //   const selection = window.getSelection()
  //   if (selection && selection.rangeCount > 0) {
  //     const startNode = selection.anchorNode
  //     if (startNode) {
  //       const timeStart = (startNode.parentNode as HTMLElement).dataset
  //         .timeStart
  //       const formattedTime = convertSecondsToTimestamp(Number(timeStart))
  //       startNode.textContent = `${startNode.textContent} [${formattedTime}] ____ `
  //     }
  //   }
  // }

  // if (event.altKey && event.code === 'KeyM') {
  //   const selection = window.getSelection()
  //   if (selection && selection.rangeCount > 0) {
  //     const startNode = selection.anchorNode
  //     const element = startNode?.parentNode as HTMLElement
  //     if (element.classList.contains('misspelled')) {
  //       const suggestions = JSON.parse(
  //         element.dataset.wordSuggestions as string
  //       )
  //       if (suggestions && suggestions.length) {
  //         setWordSuggestions({ suggestions, node: element })
  //         setSpellcheckModal(true)
  //       }
  //     }
  //   }
  // }

  //   if (event.shiftKey && event.key === 'F12') {
  //     event.preventDefault()
  //     const selection = window.getSelection()
  //     const anchorNode = selection?.anchorNode?.parentNode
  //     if (anchorNode) {
  //       const startTime = (anchorNode as HTMLElement).dataset.timeStart
  //       // Capture the anchorNode data immediately in a temporary variable
  //       const tempAnchorNodeData = {
  //         timeStart: startTime || '',
  //         outerHTML: (anchorNode as HTMLElement).outerHTML,
  //       }
  //       // Use the temporary variable to set the state
  //       setAnchorNodeData(tempAnchorNodeData)

  //       setTimeout(() => {
  //         setSpeakerNameModalOpen(true)
  //       }, 100)
  //     }
  //   }
  // })

  //   document.addEventListener('keyup', handleKeyUp)
  //   document.addEventListener('keydown', handleKeyDown)

  //   return () => {
  //     document.removeEventListener('keyup', handleKeyUp)
  //     document.removeEventListener('keydown', handleKeyDown)
  //   }
  // }, [])

  const insertNewSpeaker = useCallback((event: KeyboardEvent) => {
    if (event.shiftKey && event.key === 'F12') {
      const quill = quillRef?.current?.getEditor()
      if (quill) {
        const range = quill.getSelection(true)
        const currentTime = audioPlayer?.currentTime
        if (range && currentTime != null) {
          const timestamps = convertSecondsToTimestamp(currentTime)
          quill.insertText(range.index, `${timestamps} S1: `)
        }
      }
    }
  }, [quillRef, audioPlayer])

  useEffect(() => {
    document.addEventListener('keydown', insertNewSpeaker)
    return () => {
      document.removeEventListener('keydown', insertNewSpeaker)
    }
  }, [insertNewSpeaker])

  const sectionChangeHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    const value = e.currentTarget.dataset.value
    if (!value) return
    setSelectedSection(value)
  }

  useEffect(() => {
    if (!session || !session.user) return

    if (!process.env.NEXT_PUBLIC_DEV_EDITOR_TESTER?.split(',').includes(session?.user?.email)) {
      router.push(`/editor/${params?.orderId}`)
      return
    }

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

    fetchFileDetails({ params, setOrderDetails, setCfd, setStep, setDownloadableType, setTranscript, setCtms })

    const file = localStorage.getItem(orderDetails?.fileId as string)
    if (file) {
      setNotes(JSON.parse(file).notes)
    }
  }, [])

  const handleTabChange = () => {
    //TODO: Fix this
    const diff = diffWords(transcript, getEditorText())
    setDiff(diff)
  }

  useEffect(() => {
    handleTabChange()
  }, [selectedSection])

  const getEditorText = () => quillRef?.current?.getEditor().getText() || '';

  const getAudioPlayer = (audioPlayer: HTMLAudioElement | null) => {
    setAudioPlayer(audioPlayer)
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
    const handleTimeUpdate = () => {
      if (!audioPlayer) return
      const currentTime = Math.floor(audioPlayer.currentTime)
      setAudioPlayed((prev) => new Set(prev.add(currentTime)))
      updatePlayedPercentage(audioPlayer, audioPlayed, setPlayedPercentage)
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
      regenDocx(orderDetails.fileId, orderDetails.orderId, setButtonLoading, setRegenCount, setPdfUrl)
      setInitialPDFLoaded(true)
    }
  }, [orderDetails, editorMode])

  // const speakerNameChangeHandler = () => {
  //   //TODO: Fix this
  // }

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

  const getQuillRef = (quillRef: React.RefObject<ReactQuill>) => {
    setQuillRef(quillRef)
  }

  const getCtms = (ctms: CTMSWord[]) => {
    setUpdatedCtms(ctms)
  }

  const handleAdjustTimestamps = () => {
    const quill = quillRef?.current?.getEditor();
    if (!quill) return;
    if (Number(adjustTimestampsBy) === 0) {
      toast.error('Please enter a valid number of seconds to adjust timestamps by')
      return
    }
    adjustTimestampsInstance()
  }

  const setSelectionHandler = () => {
    const quill = quillRef?.current?.getEditor();
    if (!quill) return;
    const range = quill.getSelection();
    if (range) {
      setSelection({ index: range.index, length: range.length });
    } else {
      setSelection(null);
    }
  }

  return (
    <div className='bg-[#F7F5FF] h-screen'>
      <NewHeader
        editorMode={editorMode}
        editorModeOptions={editorModeOptions}
        getEditorMode={getEditorMode}
        notes={notes}
        setNotes={setNotes}
        quillRef={quillRef}
        orderDetails={orderDetails}
        audioPlayer={audioPlayer}
      />
      <div className='flex justify-between px-16 my-5'>
        <p className='inline-block font-semibold'>{orderDetails.filename}</p>
        <div className='inline-flex'>
          <Button
            disabled={buttonLoading.mp3}
            onClick={downloadMP3.bind(null, orderDetails, setButtonLoading)}
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
                  <DownloadDocxDialog orderDetails={orderDetails} downloadableType={downloadableType} setButtonLoading={setButtonLoading} buttonLoading={buttonLoading} setDownloadableType={setDownloadableType} />

                  <UploadDocxDialog orderDetails={orderDetails} setButtonLoading={setButtonLoading} buttonLoading={buttonLoading} setFileToUpload={setFileToUpload} fileToUpload={fileToUpload} session={session} />
                </>
              )}
            </>
          )}

          {step === 'QC' && (
            <>
              <Button
                disabled={buttonLoading.download}
                onClick={downloadEditorTextFile.bind(null, orderDetails, setButtonLoading)}
              >
                {' '}
                {buttonLoading.download && (
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                )}{' '}
                Download Text File
              </Button>

              <UploadTextFile orderDetails={orderDetails} setFileToUpload={setFileToUpload} fileToUpload={fileToUpload} buttonLoading={buttonLoading} setButtonLoading={setButtonLoading} session={session} />

              <Button
                disabled={buttonLoading.download || !fileToUpload.isUploaded}
                onClick={downloadEditorDocxFile.bind(null, orderDetails, setButtonLoading)}
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
              onClick={() => regenDocx(orderDetails.fileId, orderDetails.orderId, setButtonLoading, setRegenCount, setPdfUrl)}
              disabled={buttonLoading.regenDocx}
            >
              {' '}
              {buttonLoading.regenDocx && (
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              )}{' '}
              Regenerate Document
            </Button>
          )}
          <ReportDialog reportModalOpen={reportModalOpen} setReportModalOpen={setReportModalOpen} reportDetails={reportDetails} setReportDetails={setReportDetails} orderDetails={orderDetails} buttonLoading={buttonLoading} setButtonLoading={setButtonLoading} />
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
                onClick={() => handleSave({ getEditorText, orderDetails, notes, step, cfd, updatedCtms, setButtonLoading })}
                // disabled={buttonLoading.save}
                // disabled={true}
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
            onClick={() => handleSubmit({ orderDetails, step, editorMode, fileToUpload, setButtonLoading, getPlayedPercentage, MINIMUM_AUDIO_PLAYBACK_PERCENTAGE, router })}
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
            <NewAudioPlayer
              fileId={orderDetails.fileId}
              getAudioPlayer={getAudioPlayer}
            />
            <div className='bg-white border rounded-2xl flex h-10'>
              <ActionButton onClick={playNextBlankInstance()} tooltip='Play current paragraph'>
                <ThickArrowRightIcon />
              </ActionButton>
              <ActionButton onClick={playPreviousBlankInstance()} tooltip='Play previous blank'>
                <ThickArrowLeftIcon />
              </ActionButton>
              <ActionButton onClick={playCurrentParagraphInstance()} tooltip='Play audio from the start of current paragraph'>
                <TextAlignLeftIcon />
              </ActionButton>
              <Dialog>
                <DialogTrigger asChild>
                  <ActionButton onClick={setSelectionHandler} tooltip='Adjust timestamps'>
                    <ClockIcon />
                  </ActionButton>
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
                    onChange={(e) => setAdjustTimestampsBy(e.target.value)}
                  />
                  <DialogClose asChild>
                    <Button
                      onClick={handleAdjustTimestamps}
                    >
                      Adjust
                    </Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>

            </div>
            <div className='h-[66%]'>
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
                      <TabsTrigger className='text-base' value='diff'>
                        Diff
                      </TabsTrigger>
                      <TabsTrigger className='text-base' value='info'>
                        Info
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <EditorTabComponent transcript={transcript} ctms={ctms} audioPlayer={audioPlayer} audioDuration={audioDuration} getQuillRef={getQuillRef} getCtms={getCtms} disableGoToWord={disableGoToWord} />

                  <SpeakerNameTabComponent />

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
    </div>
  )
}

export default EditorPage
