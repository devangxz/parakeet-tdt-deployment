'use client'

import { ClockIcon, Cross1Icon, ReloadIcon, TextAlignLeftIcon, ThickArrowLeftIcon, ThickArrowRightIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { Change, diffWords } from 'diff'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useCallback, useEffect, useState, useMemo } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import ActionButton from '@/components/editor/ActionButton'
import renderCaseDetailsInputs from '@/components/editor/CaseDetailsInput'
import renderCertificationInputs from '@/components/editor/CertificationInputs'
import DownloadDocxDialog from '@/components/editor/DownloadDocxDialog'
import FrequentTermsDialog from '@/components/editor/FrequentTermsDialog'
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
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RenderPDFDocument } from '@/components/utils'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
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
  getFrequentTermsHandler,
  adjustTimestamps,
  navigateAndPlayBlanks,
  playCurrentParagraphTimestamp,
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
  const [selection, setSelection] = useState<{ index: number; length: number } | null>(null);
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

  const [adjustTimestampsBy, setAdjustTimestampsBy] = useState('0')
  const [audioDuration, setAudioDuration] = useState(1)
  const [quillRef, setQuillRef] = useState<React.RefObject<ReactQuill>>()

  const [frequentTermsModalOpen, setFrequentTermsModalOpen] = useState(false);
  const [frequentTermsData, setFrequentTermsData] = useState({
    autoGenerated: '',
    edited: ''
  });

  const [disableGoToWord, setDisableGoToWord] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [lastSearchIndex, setLastSearchIndex] = useState<number>(-1)
  const [replaceMisspelledWord, setReplaceMisspelledWord] = useState<string>('');
  const [spellcheckOpen, setSpellcheckOpen] = useState(false);
  const [spellcheckValue, setSpellCheckValue] = useState<{ word: string, suggestions: string[] }[]>([]);

  const getEditorText = () => quillRef?.current?.getEditor().getText() || '';

  const playNextBlankInstance = () => {
    const quill = quillRef?.current?.getEditor();
    if (!quill) return;
    return navigateAndPlayBlanks.bind(null, quill, audioPlayer, setDisableGoToWord, false)
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

  const shortcutControls = useMemo(() => {
    const controls: Partial<ShortcutControls> = {
      playNextBlank: playNextBlankInstance(),
      playPreviousBlank: playPreviousBlankInstance(),
      playAudioFromTheStartOfCurrentParagraph: playCurrentParagraphInstance(),
      saveChanges: () => handleSave({ getEditorText, orderDetails, notes, step, cfd, updatedCtms, setButtonLoading }),
    };
    return controls as ShortcutControls;
  }, [
    playNextBlankInstance,
    playPreviousBlankInstance,
    playCurrentParagraphInstance,
    getEditorText,
    orderDetails,
    notes,
    step,
    cfd,
    updatedCtms,
    setButtonLoading
  ]);

  useShortcuts(shortcutControls);

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.addEventListener('loadedmetadata', () => {
        setAudioDuration(audioPlayer.duration);
      });
    }
  }, [audioPlayer]);

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

  const handleDragChange = (e: React.MouseEvent<HTMLDivElement | HTMLVideoElement>) => {
    e.preventDefault();
    const target = e.target as HTMLDivElement; // Correctly typecast the event target
    const onMouseMove = (moveEvent: MouseEvent) => {
      setPosition({
        x: moveEvent.clientX - deltaX,
        y: moveEvent.clientY - deltaY,
      });
    };

    const deltaX = e.clientX - target.getBoundingClientRect().left;
    const deltaY = e.clientY - target.getBoundingClientRect().top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', () => {
      document.removeEventListener('mousemove', onMouseMove);
    }, { once: true });
  }

  const replaceTextInstance = (findText: string, replaceText: string, replaceAll = false) => {
    if (!quillRef?.current) return;
    const quill = quillRef.current.getEditor();
    replaceTextHandler(quill, findText, replaceText, replaceAll, false, toast);
  };

  const searchAndSelectInstance = (searchText: string) => {
    if (!quillRef?.current) return;
    const quill = quillRef.current.getEditor();
    searchAndSelect(quill, searchText, false, lastSearchIndex, setLastSearchIndex, toast);
  };

  const toggleSpellcheck = async () => {
    if (!quillRef?.current) return;
    let toastId;
    try {
      if (!spellcheckValue.length) {
        toastId = toast.loading('Running spellcheck...')
        const transcript = quillRef?.current?.getEditor().getText();
        const response = await axios.post(`/api/editor/spellcheck`, { transcript })
        setSpellCheckValue(response.data.misspelledWords.filter((word: { word: string, suggestions: string[] }) => word.suggestions.length > 0))
        searchAndSelectInstance(response.data.misspelledWords[0].word)
        toast.dismiss(toastId)
        toastId = toast.success('Spellcheck completed successfully')
        toast.dismiss(toastId)
      }
      setSpellcheckOpen(!spellcheckOpen);
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to run spellcheck')
    }
  }

  let wordsIgnored = 0

  const handleSpellcheckAction = (action: string) => {
    if (!spellcheckValue.length) return;
    const currentWord = ` ${spellcheckValue[0].word} `;
    if (action === 'ignoreOnce') {
      setReplaceMisspelledWord('');
      searchAndSelectInstance(currentWord);
      wordsIgnored += 1
    } else if (action === 'ignoreAll') {
      setReplaceMisspelledWord('');
      searchAndSelectInstance(` ${spellcheckValue[1].word} `);
      setSpellCheckValue(spellcheckValue.slice(1));
    }

    if (action === 'changeOnce') {
      if (!replaceMisspelledWord) return toast.error('Please enter a word to replace');
      searchAndSelectInstance(currentWord);
      replaceTextInstance(currentWord, ` ${replaceMisspelledWord} `);
    }

    if (action === 'changeAll') {
      if (!replaceMisspelledWord) return toast.error('Please enter a word to replace');
      replaceTextInstance(currentWord, ` ${replaceMisspelledWord} `, true);
    }

    const quill = quillRef?.current?.getEditor();
    if (quill) {
      const text = quill.getText();
      const wordOccurrences = text.split(currentWord).length - 1;
      if (!text.includes(currentWord) || wordOccurrences <= wordsIgnored) {
        searchAndSelectInstance(` ${spellcheckValue[1].word} `);
        setSpellCheckValue(spellcheckValue.slice(1));
        setReplaceMisspelledWord('');
      }
    }
  }

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const updateRemainingTime = () => {
      const remainingSeconds = parseInt(orderDetails.remainingTime);
      if (remainingSeconds > 0) {
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = remainingSeconds % 60;

        const formattedTime = [
          hours.toString().padStart(2, '0'),
          minutes.toString().padStart(2, '0'),
          seconds.toString().padStart(2, '0')
        ].join(':');

        setTimeoutCount(formattedTime);
        orderDetails.remainingTime = (remainingSeconds - 1).toString();

        timer = setTimeout(updateRemainingTime, 1000);
      } else {
        setTimeoutCount('00:00:00');
      }
    };

    updateRemainingTime();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [orderDetails]);

  return (
    <div className='bg-[#F7F5FF] h-screen flex flex-col'>
      <NewHeader
        editorMode={editorMode}
        editorModeOptions={editorModeOptions}
        getEditorMode={getEditorMode}
        notes={notes}
        setNotes={setNotes}
        quillRef={quillRef}
        orderDetails={orderDetails}
        audioPlayer={audioPlayer}
        submitting={submitting}
        setIsSubmitModalOpen={setIsSubmitModalOpen}
      />
      <div className='flex justify-between px-16 my-5'>
        <div className='flex'>
          <p className='inline-block font-semibold'>{orderDetails.filename}</p>
          <strong className={`text-red-600 ml-2 ${orderDetails.remainingTime === '0' ? 'animate-pulse' : ''}`}>{timeoutCount}</strong>
        </div>
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
            onClick={() => setSubmitting(true)}
            className='ml-2'
          >
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={playNextBlankInstance()} tooltip=''>
                      <ThickArrowRightIcon />
                    </ActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play next blank</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={playPreviousBlankInstance()} tooltip=''>
                      <ThickArrowLeftIcon />
                    </ActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play previous blank</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={playCurrentParagraphInstance()} tooltip=''>
                      <TextAlignLeftIcon />
                    </ActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play audio from the start of current paragraph</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <ActionButton onClick={setSelectionHandler} tooltip=''>
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
                            <Button onClick={handleAdjustTimestamps}>
                              Adjust
                            </Button>
                          </DialogClose>
                        </DialogContent>
                      </Dialog>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust timestamps</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
      <div className='self-end px-16 mb-5 mt-7'>
        <FrequentTermsDialog frequentTermsModalOpen={frequentTermsModalOpen} setFrequentTermsModalOpen={setFrequentTermsModalOpen} frequentTermsData={frequentTermsData} />

        <Button
          onClick={() => getFrequentTermsHandler(orderDetails?.userId, setButtonLoading, setFrequentTermsData, setFrequentTermsModalOpen)}
          disabled={buttonLoading.frequentTerms}
        >
          {' '}
          {buttonLoading.frequentTerms && (
            <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
          )}{' '}
          Frequent Terms
        </Button>
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
                if (!quillRef?.current) return;
                const quill = quillRef.current.getEditor();
                handleSubmit({ orderDetails, step, editorMode, fileToUpload, setButtonLoading, getPlayedPercentage, router, quill })
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
      {spellcheckOpen && <div
        className="fixed bg-white z-[1000] overflow-auto py-4 px-4 rounded-lg shadow-lg overflow-y-hidden border"
        style={{ top: `${position.y}px`, left: `${position.x}px`, width: '500px', }}
      >
        <div onMouseDown={handleDragChange} className='cursor-move border-b flex justify-between items-center pb-2'>
          <p className='text-lg font-semibold'>Spellcheck</p>
          <button onClick={toggleSpellcheck} className='cursor-pointer hover:bg-gray-100 p-2 rounded-lg'><Cross1Icon /></button>
        </div>
        <div className='mt-4 max-h-[400px] overflow-y-auto'>
          {spellcheckValue && spellcheckValue.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Misspelled: {spellcheckValue[0].word}</p>
              <div className="flex flex-col">
                {spellcheckValue[0].suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setReplaceMisspelledWord(suggestion)}
                    className={`text-left py-1 px-2 hover:bg-gray-100 rounded ${replaceMisspelledWord === suggestion ? 'bg-blue-100' : ''}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between">
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
      </div>}
    </div>
  )
}

export default EditorPage
