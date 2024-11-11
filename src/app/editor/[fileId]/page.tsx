'use client'

import { ClockIcon, Cross1Icon, ReloadIcon, TextAlignLeftIcon, ThickArrowLeftIcon, ThickArrowRightIcon, ZoomInIcon, ZoomOutIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { Change, diffWords } from 'diff'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import React, { useCallback, useEffect, useState, useMemo } from 'react'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import ActionButton from '@/components/editor/ActionButton'
import AudioPlayer from '@/components/editor/AudioPlayer'
import renderCaseDetailsInputs from '@/components/editor/CaseDetailsInput'
import renderCertificationInputs from '@/components/editor/CertificationInputs'
import DownloadDocxDialog from '@/components/editor/DownloadDocxDialog'
import FrequentTermsDialog from '@/components/editor/FrequentTermsDialog'
import Header from '@/components/editor/Header'
import ReportDialog from '@/components/editor/ReportDialog'
import SectionSelector from '@/components/editor/SectionSelector'
import { DiffTabComponent, EditorTabComponent, InfoTabComponent } from '@/components/editor/TabComponents'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/editor/Tabs'
import renderTitleInputs from '@/components/editor/TitleInputs'
import { LineData } from '@/components/editor/transcriptUtils'
import UploadDocxDialog from '@/components/editor/UploadDocxDialog'
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
import { Textarea } from '@/components/ui/textarea'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RenderPDFDocument } from '@/components/utils'
import { AUTOSAVE_INTERVAL } from '@/constants'
import usePreventMultipleTabs from '@/hooks/usePreventMultipleTabs'
import { ShortcutControls, useShortcuts } from '@/utils/editorAudioPlayerShortcuts'
import {
  ConvertedASROutput,
  updatePlayedPercentage,
  regenDocx,
  fetchFileDetails,
  handleSave,
  handleSubmit,
  getFrequentTermsHandler,
  adjustTimestamps,
  navigateAndPlayBlanks,
  playCurrentParagraphTimestamp,
  replaceTextHandler,
  searchAndSelect,
  downloadBlankDocx,
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
  const [reReviewComment, setReReviewComment] = useState('')

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
  const [content, setContent] = useState<{ insert: string }[]>([])
  const [lines, setLines] = useState<LineData[]>([])

  const isActive = usePreventMultipleTabs(params?.fileId as string || '')

  if (!isActive) {
    router.back()
  }

  const getEditorText = useCallback(() => quillRef?.current?.getEditor().getText() || '', [quillRef]);

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
    return adjustTimestamps(quill, Number(adjustTimestampsBy), selection)
  }, [audioPlayer, quillRef, adjustTimestampsBy])

  const shortcutControls = useMemo(() => {
    const controls: Partial<ShortcutControls> = {
      playNextBlank: playNextBlankInstance(),
      playPreviousBlank: playPreviousBlankInstance(),
      playAudioFromTheStartOfCurrentParagraph: playCurrentParagraphInstance(),
      saveChanges: () => handleSave({ getEditorText, orderDetails, notes, cfd, setButtonLoading, lines }),
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

    fetchFileDetails({ params, setOrderDetails, setCfd, setStep, setDownloadableType, setTranscript, setCtms })

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
      await handleSave({ getEditorText, orderDetails, notes, cfd, setButtonLoading, lines })
    }, 1000 * 60 * AUTOSAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [getEditorText, orderDetails, notes, step, cfd, lines])

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
      if (submitting && spellcheckOpen) {
        setIsSubmitModalOpen(true);
        setSubmitting(false);
      }
    } catch (error) {
      toast.dismiss(toastId)
      toast.error('Failed to run spellcheck')
    }
  }

  const handleSpellcheckAction = (action: string) => {
    if (!spellcheckValue.length) {
      setIsSubmitModalOpen(true);
      setSpellcheckOpen(false);
      return;
    }

    const currentWord = spellcheckValue[0].word;

    if (action === 'ignoreOnce') {
      // Remove the current word instance
      const newSpellcheckValue = [...spellcheckValue];
      newSpellcheckValue.shift();
      setSpellCheckValue(newSpellcheckValue);
      setReplaceMisspelledWord('');

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false);
        setIsSubmitModalOpen(true);
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `);
      }
    }

    if (action === 'ignoreAll') {
      // Remove all instances of the current word
      const newSpellcheckValue = spellcheckValue.filter(item => item.word !== currentWord);
      setSpellCheckValue(newSpellcheckValue);
      setReplaceMisspelledWord('');

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false);
        setIsSubmitModalOpen(true);
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `);
      }
    }

    if (action === 'changeOnce') {
      if (!replaceMisspelledWord) return toast.error('Please enter a word to replace');

      // Replace current instance and remove from array
      searchAndSelectInstance(` ${currentWord} `);
      replaceTextInstance(` ${currentWord} `, ` ${replaceMisspelledWord} `);

      const newSpellcheckValue = [...spellcheckValue];
      newSpellcheckValue.shift();
      setSpellCheckValue(newSpellcheckValue);
      setReplaceMisspelledWord('');

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false);
        setIsSubmitModalOpen(true);
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `);
      }
    }

    if (action === 'changeAll') {
      if (!replaceMisspelledWord) return toast.error('Please enter a word to replace');

      // Replace all instances and remove all occurrences from array
      replaceTextInstance(` ${currentWord} `, ` ${replaceMisspelledWord} `, true);
      const newSpellcheckValue = spellcheckValue.filter(item => item.word !== currentWord);
      setSpellCheckValue(newSpellcheckValue);
      setReplaceMisspelledWord('');

      if (newSpellcheckValue.length === 0) {
        setSpellcheckOpen(false);
        setIsSubmitModalOpen(true);
      } else {
        searchAndSelectInstance(` ${newSpellcheckValue[0].word} `);
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

  const adjustFontSize = useCallback((increase: boolean) => {
    if (!quillRef?.current) return;
    const quill = quillRef.current.getEditor();
    const container = quill.container as HTMLElement;
    const currentSize = parseInt(window.getComputedStyle(container).fontSize);
    if (increase) {
      container.style.fontSize = `${currentSize + 2}px`;
    } else {
      container.style.fontSize = `${currentSize - 2}px`;
    }
  }, [quillRef])

  const increaseFontSize = () => adjustFontSize(true);
  const decreaseFontSize = () => adjustFontSize(false);

  const handleReReview = async () => {
    const toastId = toast.loading('Processing re-review request...')
    try {
      await axios.post(`/api/editor/re-review`, {
        fileId: orderDetails.fileId,
        comment: reReviewComment,
      })
      toast.dismiss(toastId)
      const successToastId = toast.success(`Re-review request submitted successfully`)
      toast.dismiss(successToastId)
    } catch (error) {
      toast.error('Failed to re-review the file')
    }
  }

  const getLines = (lineData: LineData[]) => {
    setLines(lineData)
  }

  return (
    <div className='bg-[#F7F5FF] h-screen flex flex-col'>
      <Header
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
        toggleSpellCheck={toggleSpellcheck}
        setSubmitting={setSubmitting}
      />
      <div className='flex justify-between px-16 my-5'>
        <div className='flex'>
          <p className='inline-block font-semibold'>{orderDetails.filename}</p>
          {session?.user?.role !== 'CUSTOMER' && <strong className={`text-red-600 ml-2 ${orderDetails.remainingTime === '0' ? 'animate-pulse' : ''}`}>{timeoutCount}</strong>}
        </div>
        <div className='inline-flex'>

          {step !== 'QC' && (
            <>
              {editorMode === 'Manual' && (
                <>
                  {orderDetails.status === 'FINALIZER_ASSIGNED' || orderDetails.status === 'PRE_DELIVERED' ? (
                    <Button onClick={() => downloadBlankDocx({ orderDetails, downloadableType: "markings", setButtonLoading })}>
                      Download DOCX
                    </Button>
                  )
                    :
                    <DownloadDocxDialog orderDetails={orderDetails} downloadableType={downloadableType} setButtonLoading={setButtonLoading} buttonLoading={buttonLoading} setDownloadableType={setDownloadableType} />
                  }

                  <UploadDocxDialog orderDetails={orderDetails} setButtonLoading={setButtonLoading} buttonLoading={buttonLoading} setFileToUpload={setFileToUpload} fileToUpload={fileToUpload} session={session} />
                </>
              )}
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
          {session?.user?.role !== 'CUSTOMER' && <>
            <ReportDialog reportModalOpen={reportModalOpen} setReportModalOpen={setReportModalOpen} reportDetails={reportDetails} setReportDetails={setReportDetails} orderDetails={orderDetails} buttonLoading={buttonLoading} setButtonLoading={setButtonLoading} />
            <Button
              onClick={() => setReportModalOpen(true)}
              className='ml-2'
              variant='destructive'
            >
              Report
            </Button>
          </>}

          {session?.user?.role === 'CUSTOMER' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Re-Review</Button>
              </DialogTrigger>
              <DialogContent className="w-2/5">
                <DialogHeader>
                  <DialogTitle>Order Re-review</DialogTitle>
                  <DialogDescription>
                    Please enter specific instructions for the re-review, if any
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Textarea
                    onChange={(e) => setReReviewComment(e.target.value)}
                    placeholder="Enter instructions..."
                    className="min-h-[100px] resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleReReview} type="submit">Order</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {editorMode === 'Editor' ||
            ((step === 'QC' || session?.user?.role === 'OM') && (
              <Button
                onClick={() => handleSave({ getEditorText, orderDetails, notes, cfd, setButtonLoading, lines })}
                disabled={buttonLoading.save}
                className='ml-2'
              >
                {' '}
                {buttonLoading.save && (
                  <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                )}{' '}
                Save
              </Button>
            ))}

          {!(['CUSTOMER', 'OM', 'ADMIN'].includes(session?.user?.email ?? '')) && <Button
            onClick={() => setSubmitting(true)}
            className='ml-2'
          >
            Submit
          </Button>}
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
              fileId={orderDetails.fileId}
              getAudioPlayer={getAudioPlayer}
            />
            <div className='bg-white border rounded-2xl flex h-10'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={playNextBlankInstance()}>
                      <ThickArrowRightIcon />
                    </ActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play next blank</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={playPreviousBlankInstance()}>
                      <ThickArrowLeftIcon />
                    </ActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Play previous blank</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={playCurrentParagraphInstance()}>
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
                          <ActionButton onClick={setSelectionHandler}>
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

                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={increaseFontSize}>
                      <ZoomInIcon />
                    </ActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Increase font size</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger>
                    <ActionButton onClick={decreaseFontSize}>
                      <ZoomOutIcon />
                    </ActionButton>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Decrease font size</p>
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
                      <TabsTrigger className='text-base' value='diff'>
                        Diff
                      </TabsTrigger>
                      <TabsTrigger className='text-base' value='info'>
                        Info
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <EditorTabComponent content={content} getLines={getLines} setContent={setContent} orderDetails={orderDetails} transcript={transcript} ctms={ctms} audioPlayer={audioPlayer} audioDuration={audioDuration} getQuillRef={getQuillRef} disableGoToWord={disableGoToWord} />

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
      {session?.user?.role !== 'CUSTOMER' && <div className='self-end px-16 mb-5 mt-7'>
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
      </div>}

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
