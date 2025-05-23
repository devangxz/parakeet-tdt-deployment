/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { Session, User } from 'next-auth'
import Quill from 'quill'
import { Delta, Op } from 'quill/core'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import axiosInstance from './axios'
import { secondsToTs } from './secondsToTs'
import createTestFile from '@/app/actions/admin/create-test-files'
import { fileCacheTokenAction } from '@/app/actions/auth/file-cache-token'
import { getFrequentTermsAction } from '@/app/actions/editor/frequent-terms'
import { getPlayStatsAction } from '@/app/actions/editor/get-play-stats'
import { getOrderDetailsAction } from '@/app/actions/editor/order-details'
import { reportFileAction } from '@/app/actions/editor/report-file'
import { setPlayStatsAction } from '@/app/actions/editor/set-play-stats'
import { submitQCAction } from '@/app/actions/editor/submit-qc'
import { submitReviewAction } from '@/app/actions/editor/submit-review'
import { uploadDocxAction } from '@/app/actions/editor/upload-docx'
import { uploadFormattingFilesAction } from '@/app/actions/editor/upload-formatting-files'
import { uploadSubtitlesAction } from '@/app/actions/editor/upload-subtitles'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { OrderDetails, UploadFilesType } from '@/components/editor/EditorPage'
import {
  ALLOWED_META,
  BACKEND_URL,
  FILE_CACHE_URL,
  MINIMUM_AUDIO_PLAYBACK_PERCENTAGE,
  COMMON_ABBREVIATIONS,
  MAX_FORMAT_FILES,
  FORMAT_FILES_EXCEPTION_LIST,
  QC_VALIDATION,
} from '@/constants'
import { getModifiedTranscript, getTranscriptVersion, setTranscriptVersion } from '@/services/editor-service/get-set-version-transcript'
import { AlignmentType, CTMType, UndoRedoItem, QCValidation, CombinedASRFormatError } from '@/types/editor'
import {
  getEditorDataIDB,
  persistEditorDataIDB,
  deleteEditorDataIDB,
} from '@/utils/indexedDB'
import {
  createAlignments,
  getFormattedTranscript,
} from '@/utils/transcript'
import {
  DIFF_INSERT,
  DIFF_DELETE,
  DIFF_EQUAL,
} from '@/utils/transcript/diff_match_patch'

export type ButtonLoading = {
  upload: boolean
  submit: boolean
  save: boolean
  report: boolean
  regenDocx: boolean
  mp3: boolean
  download: boolean
  frequentTerms: boolean
}

const usableColors = [
  '#FF4136', // Red
  '#2ECC40', // Green
  '#0074D9', // Blue
  '#FFDC00', // Yellow
  '#B10DC9', // Magenta
  '#39CCCC', // Cyan
  '#FF851B', // Orange
  '#F012BE', // Purple
  '#3D9970', // Teal
  '#FF69B4', // Pink
  '#01FF70', // Lime Green
  '#85144b', // Dark Red
  '#3F729B', // Dark Blue
  '#FFD700', // Gold
  '#9400D3', // Dark Violet
  '#3CB371', // Medium Sea Green
  '#FF1493', // Deep Pink
  '#FF6347', // Tomato
  '#20B2AA', // Light Sea Green
  '#7B68EE', // Medium Slate Blue
]

function generateRandomColor() {
  const color = usableColors[0]
  usableColors.splice(0, 1)
  return color
}

function convertBlankToSeconds(timeString: string) {
  const pattern = /\[(\d{1,2}):(\d{2}):(\d{2})\.(\d)\]/
  const matches = timeString.match(pattern)

  if (!matches) {
    return null // Invalid time format
  }

  const hours = parseInt(matches[1])
  const minutes = parseInt(matches[2])
  const seconds = parseInt(matches[3])
  const tenths = parseInt(matches[4])

  const totalSeconds = hours * 3600 + minutes * 60 + seconds + tenths * 0.1
  return totalSeconds
}

function convertTimestampToSeconds(timestamp: string) {
  const [hours, minutes, seconds] = timestamp.split(':').map(parseFloat)
  const totalSeconds = hours * 3600 + minutes * 60 + seconds
  return totalSeconds
}

const updatePlayedPercentage = (
  audioPlayer: HTMLAudioElement | null,
  audioPlayed: Set<number>,
  setPlayedPercentage: React.Dispatch<React.SetStateAction<number>>
) => {
  if (!audioPlayer) return
  const duration = audioPlayer.duration
  const playedArray = Array.from(audioPlayed).sort((a, b) => a - b)
  let uniquePlayedSeconds = 0
  if (playedArray.length > 0) {
    uniquePlayedSeconds = playedArray.reduce((acc, cur, index, srcArray) => {
      if (index === 0) {
        return 1 // Count the first second as played
      } else {
        // Only count as unique if it's not the same as the previous second
        return cur !== srcArray[index - 1] ? acc + 1 : acc
      }
    }, 0)
  }
  const percentagePlayed = (uniquePlayedSeconds / duration) * 100
  setPlayedPercentage(Math.min(100, percentagePlayed)) // Ensure percentage does not exceed 100
}

const convertSecondsToTimestamp = (seconds: number) =>
  secondsToTs(seconds, true, 1)

const downloadMP3 = async (orderDetails: OrderDetails) => {
  const toastId = toast.loading('Downloading MP3...')
  try {
    const response = await getSignedUrlAction(`${orderDetails.fileId}.mp3`, 60)
    if (response.success && response.signedUrl) {
      window.open(response.signedUrl, '_blank')
      toast.dismiss(toastId)
      toast.success(`MP3 downloaded successfully`)
    } else {
      throw new Error('No download URL received')
    }
  } catch (error) {
    toast.dismiss(toastId)
    toast.error('Error downloading mp3')
  }
}

const handleTextFilesUpload = async (
  payload: UploadFilesType,
  orderDetails: OrderDetails,
  setFileToUpload: React.Dispatch<
    React.SetStateAction<{
      renamedFile: File | null
      originalFile: File | null
      isUploaded?: boolean
    }>
  >
) => {
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

const uploadTextFile = async (
  fileToUpload: { renamedFile: File | null },
  orderDetails: OrderDetails,
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>,
  session: Session | null,
  setFileToUpload: React.Dispatch<
    React.SetStateAction<{
      renamedFile: File | null
      originalFile: File | null
      isUploaded?: boolean
    }>
  >
) => {
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

const uploadFile = async (
  fileToUpload: { renamedFile: File | null },
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>,
  session: Session | null,
  setFileToUpload: React.Dispatch<
    React.SetStateAction<{
      renamedFile: File | null
      originalFile: File | null
      isUploaded?: boolean
    }>
  >,
  fileId: string
) => {
  const file = fileToUpload.renamedFile
  if (!file) return toast.error('Please select a file to upload.')

  if (!session?.user?.token) {
    return
  }

  setButtonLoading((prevButtonLoading) => ({
    ...prevButtonLoading,
    upload: true,
  }))

  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await uploadDocxAction(formData, fileId)

    if (response.success) {
      toast.success('File uploaded successfully')
      setFileToUpload({
        renamedFile: null,
        originalFile: null,
        isUploaded: true,
      })
    } else {
      throw new Error(response.message)
    }
  } catch (uploadError) {
    toast.error('Failed to upload file')
    setFileToUpload({
      renamedFile: null,
      originalFile: null,
      isUploaded: false,
    })
  } finally {
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      upload: false,
    }))
  }
}

const uploadFormattingFiles = async (
  uploadedFiles: File[],
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>,
  session: Session | null,
  setFileToUpload: React.Dispatch<
    React.SetStateAction<{
      renamedFile: File | null
      originalFile: File | null
      isUploaded?: boolean
    }>
  >,
  fileId: string
) => {
  if (!uploadedFiles.length) {
    return toast.error('Please select files to upload.')
  }

  if (!session?.user?.token) {
    return
  }

  setButtonLoading((prevButtonLoading) => ({
    ...prevButtonLoading,
    upload: true,
  }))

  try {
    const formData = new FormData()

    uploadedFiles.forEach((file, index) => {
      formData.append(`file-${index}`, file)

      const fileParts = file.name.split('.')
      const fileExtension =
        fileParts.length > 1
          ? fileParts[fileParts.length - 1].toLowerCase()
          : 'docx'

      formData.append(`extension-${index}`, fileExtension)
    })

    formData.append('fileCount', uploadedFiles.length.toString())
    formData.append('fileId', fileId)

    const response = await uploadFormattingFilesAction(formData)

    if (response.success) {
      toast.success('All files uploaded successfully')
      setFileToUpload({
        renamedFile: null,
        originalFile: null,
        isUploaded: true,
      })
      return true
    } else {
      toast.error(response.message || 'Failed to upload files')
      setFileToUpload({
        renamedFile: null,
        originalFile: null,
        isUploaded: false,
      })
      return false
    }
  } catch (error) {
    toast.error('Failed to upload files')
    setFileToUpload({
      renamedFile: null,
      originalFile: null,
      isUploaded: false,
    })
    return false
  } finally {
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      upload: false,
    }))
  }
}

const getMaxFormatFiles = (email: string | null): number | null => {
  if (!email) return MAX_FORMAT_FILES

  if (FORMAT_FILES_EXCEPTION_LIST.includes(email)) {
    return null
  }

  return MAX_FORMAT_FILES
}

const handleFilesUpload = async (
  payload: UploadFilesType,
  orderDetailsId: string,
  setFileToUpload: React.Dispatch<
    React.SetStateAction<{
      renamedFile: File | null
      originalFile: File | null
      isUploaded?: boolean
    }>
  >,
  allowedFormats: string[]
) => {
  try {
    if (payload.files.length > 1) {
      toast.error('Only one file can be uploaded at a time.')
      return
    }
    
    const selectedFile = payload.files[0]
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || ''
    
    // Check if file format is allowed (either docx or one of the allowed formats)
    const isDocx = selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    const isAllowedFormat = allowedFormats.includes(fileExtension)
    
    if (!isDocx && !isAllowedFormat) {
      const formatList = ['docx', ...allowedFormats].filter(Boolean).join(', ')
      toast.error(`File format not allowed. Allowed formats: ${formatList}`)
      return
    }
    
    // Keep the original extension when renaming the file
    const renamedFile = new File(
      [selectedFile], 
      `${orderDetailsId}.${fileExtension}`, 
      { type: selectedFile.type }
    )
    
    setFileToUpload({ 
      renamedFile, 
      originalFile: selectedFile 
    })
  } catch (error) {
    throw error
  }
}

const reportHandler = async (
  reportDetails: { reportComment: string; reportOption: string },
  orderId: string,
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>,
  setReportModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setReportDetails: React.Dispatch<
    React.SetStateAction<{ reportComment: string; reportOption: string }>
  >
) => {
  const { reportComment, reportOption } = reportDetails
  if (!reportComment || !reportOption)
    return toast.error('Please enter a valid comment and report option.')
  setButtonLoading((prevButtonLoading) => ({
    ...prevButtonLoading,
    report: true,
  }))
  try {
    await reportFileAction(
      Number(orderId),
      reportDetails.reportOption,
      reportDetails.reportComment
    )
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

const fetchPdfFile = async (
  fileId: string,
  setPdfUrl: React.Dispatch<React.SetStateAction<string>>
) => {
  try {
    const response = await fetch(`${BACKEND_URL}/get-pdf-document/${fileId}`)
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

const regenDocx = async (
  fileId: string,
  orderId: string,
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>,
  setRegenCount: React.Dispatch<React.SetStateAction<number>>,
  setPdfUrl: React.Dispatch<React.SetStateAction<string>>
) => {
  setButtonLoading((prevButtonLoading) => ({
    ...prevButtonLoading,
    regenDocx: true,
  }))
  const toastId = toast.loading(`Generating Document...`)
  try {
    await axiosInstance.post(`${BACKEND_URL}/generate-cf-docx`, {
      fileId: fileId,
      orderId: orderId,
    })
    await fetchPdfFile(fileId, setPdfUrl)
    setRegenCount((prevCount) => prevCount + 1)
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

type FetchFileDetailsParams = {
  params: Record<string, string | string[]> | null
  transcriberId: number,
  user: User,
  setOrderDetails: React.Dispatch<React.SetStateAction<OrderDetails>>
  setCfd: React.Dispatch<React.SetStateAction<string>>
  setStep: React.Dispatch<React.SetStateAction<string>>
  setCtms: React.Dispatch<React.SetStateAction<CTMType[]>>
  setListenCount: React.Dispatch<React.SetStateAction<number[]>>
  setIsSettingTest: React.Dispatch<React.SetStateAction<boolean>>
}

export interface EditorData {
  transcript?: string
  notes?: string
  listenCount?: number[]
  updatedAt?: number
  undoStack?: UndoRedoItem[]
  redoStack?: UndoRedoItem[]
}

type FetchFileDetailsReturn = {
  orderDetails: OrderDetails
  initialEditorData: EditorData
}

const createCtmsWithAlignment = (alignments: AlignmentType[]): CTMType[] => (
  alignments.filter(alignment => alignment.type === 'ctm').map(alignment => {
    const ctm: CTMType = {
      word: alignment.word.toLowerCase(),
      start: alignment.start,
      end: alignment.end,
      conf: alignment.conf,
      punct: alignment.punct,
      source: alignment.source,
      speaker: alignment.speaker,  
    }
    if(alignment.turn) {
      ctm.turn = alignment.turn;
    }
    return ctm;
  })
)

const fetchFileDetails = async ({
  params,
  transcriberId,
  user,
  setOrderDetails,
  setCfd,
  setStep,
  setCtms,
  setListenCount,
  setIsSettingTest, 
}: FetchFileDetailsParams): Promise<FetchFileDetailsReturn | undefined> => {
  try {
    const tokenRes = await fileCacheTokenAction()
    const orderRes = await getOrderDetailsAction(params?.fileId as string)
    if (!orderRes?.orderDetails) {
      throw new Error('Order details not found')
    }

    const orderDetailsFormatted: OrderDetails = {
      orderId: orderRes.orderDetails.orderId.toString(),
      userId: orderRes.orderDetails.userId.toString(),
      duration: orderRes.orderDetails.duration || '',
      fileId: orderRes.orderDetails.fileId,
      orderType: orderRes.orderDetails.orderType,
      filename: orderRes.orderDetails.filename,
      templateName: orderRes.orderDetails.templateName,
      orgName: orderRes.orderDetails.orgName,
      cfd: orderRes.orderDetails.cfd,
      status: orderRes.orderDetails.status,
      instructions: orderRes.orderDetails.instructions,
      remainingTime: orderRes.orderDetails.remainingTime,
      LLMDone: orderRes.orderDetails.LLMDone,
      customFormatOption: orderRes.orderDetails.customFormatOption || undefined,
      outputFormat: orderRes.orderDetails.outputFormat || undefined,
      supportingDocuments: orderRes.orderDetails.supportingDocuments || [],
      email: orderRes.orderDetails.email,
      speakerOptions: orderRes.orderDetails.speakerOptions || [],
      isTestOrder: orderRes.orderDetails.isTestOrder,
      pwer: orderRes.orderDetails.pwer || 0,
    }

    setOrderDetails(orderDetailsFormatted)
    setCfd(orderRes.orderDetails.cfd)
    const isTestOrder = orderRes.orderDetails.isTestOrder
    const cfStatus = [
      'FORMATTED',
      'REVIEWER_ASSIGNED',
      'REVIEW_COMPLETED',
      'FINALIZER_ASSIGNED',
      'FINALIZER_COMPLETED',
    ]
    let step = 'QC'
    if (cfStatus.includes(orderRes.orderDetails.status)) {
      step = 'CF'
    }

    if (orderRes.orderDetails.status === 'PRE_DELIVERED') {
      if (
        orderRes.orderDetails.orderType === 'TRANSCRIPTION_FORMATTING' ||
        orderRes.orderDetails.orderType === 'FORMATTING'
      ) {
        step = 'CF'
      } else {
        step = 'QC'
      }
    }
    setStep(step)

    if (orderRes.orderDetails.orderType === 'FORMATTING') {
      return { orderDetails: orderDetailsFormatted, initialEditorData: {} }
    }

    let fetchTranscriptUrl = `${FILE_CACHE_URL}/fetch-transcript?fileId=${orderRes.orderDetails.fileId}&step=${step}&orderId=${orderRes.orderDetails.orderId}`
    if((user.role == 'ADMIN' || user.role == 'OM') && isTestOrder) {
      fetchTranscriptUrl += `&userId=${transcriberId}`
    }
    const transcriptRes = await axios.get(
      fetchTranscriptUrl, //step will be used later when cf editor is implemented
      {
        headers: {
          Authorization: `Bearer ${tokenRes.token}`,
        },
      }
    )

    let testTranscript = null;
    if (isTestOrder && !transcriptRes.data.error && !transcriptRes.data.result.transcript) {
      setIsSettingTest(true)
      try {
       
        const transcriptVersionData = await getTranscriptVersion(orderRes.orderDetails.orderId, orderRes.orderDetails.fileId, transcriberId)
        
        if (transcriptVersionData.modified && transcriptVersionData.modifiedTranscript) {
          testTranscript = transcriptVersionData.modifiedTranscript;
        } 
        else if (transcriptVersionData.transcript) {
          const result = await createTestFile(transcriptVersionData.transcript, orderRes.orderDetails.fileId)
          if (result.data?.modifiedTranscript) {
            await setTranscriptVersion(
              orderRes.orderDetails.fileId, 
              result.data.modifiedTranscript, 
              transcriberId
            )
            testTranscript = result.data.modifiedTranscript;
          }
        }
      } catch (error) {
        toast.error('Failed to generate test transcript');
      } finally {
        setIsSettingTest(false)
      }
    }

    // Retrieve editorData from IndexedDB once
    
    const fileData = await getEditorDataIDB(orderRes.orderDetails.fileId)

    let transcript = (isTestOrder && testTranscript ? testTranscript : fileData?.transcript ||
      transcriptRes.data.result.transcript) as string

    if(user?.role === 'CUSTOMER' || user?.role === 'OM' || user?.role === 'ADMIN' || user?.role === 'INTERNAL_TEAM_USER'){
      transcript = transcriptRes.data.result.transcript
    }
    await persistEditorDataIDB(orderRes.orderDetails.fileId, { transcript })
    
    let originalCtms = transcriptRes.data.result.ctms
    originalCtms = originalCtms.filter((ctm: CTMType) => ctm !== null)
    if(Array.isArray(originalCtms) && originalCtms.length > 0 && Array.isArray(originalCtms[0])) {
      originalCtms = originalCtms.flat()
    }
    setCtms(originalCtms)
    if (isTestOrder && transcript) {
      try {
        // Create a new worker
        const alignmentWorker = new Worker(
          new URL('@/utils/transcript/alignmentWorker.ts', import.meta.url)
        )
        
        // Process the alignment worker response
        await new Promise<void>((resolve, reject) => {
          alignmentWorker.onmessage = (e) => {
            try {
              const { alignments: newAlignments } = e.data
              const newCtms = createCtmsWithAlignment(newAlignments)
              setCtms(newCtms)
              resolve()
            } catch (error) {
              reject(error)
            } finally {
              alignmentWorker.terminate()
            }
          }
          
          alignmentWorker.onerror = (error) => {
            alignmentWorker.terminate()
            reject(error)
          }
          // Run the alignment worker with the modified transcript
          const prepareAndSendData = async () => {
            try {
              const formattedTranscript = await getFormattedTranscript(originalCtms, orderRes.orderDetails.fileId)
              alignmentWorker.postMessage({
                newText: transcript,
                currentAlignments: createAlignments(formattedTranscript, originalCtms),
                ctms: originalCtms,
              })
            } catch (error) {
              alignmentWorker.terminate()
              reject(error)
            }
          }
          
          prepareAndSendData()
        })
      } catch (error) {
        console.error('Error processing alignment:', error)
        setCtms(originalCtms)
      }
    }

    const playStats = await getPlayStatsAction(params?.fileId as string)

    if (fileData?.listenCount && Array.isArray(fileData.listenCount)) {
      setListenCount(fileData.listenCount)
    } else if (
      playStats.success &&
      playStats.data?.listenCount &&
      Array.isArray(playStats.data.listenCount)
    ) {
      setListenCount(playStats.data.listenCount as number[])
    } else if (orderRes.orderDetails.duration) {
      const newListenCount = new Array(
        Math.ceil(Number(orderRes.orderDetails.duration))
      ).fill(0)
      setListenCount(newListenCount)
    }

    const initialEditorData: EditorData = {
      ...fileData,
      transcript,
    }

    return { orderDetails: orderDetailsFormatted, initialEditorData }
  } catch (error) {
    console.log('error', error)
    if (
      error instanceof Error &&
      'response' in error &&
      typeof error.response === 'object' &&
      error.response &&
      'data' in error.response &&
      error.response.data === 'Unauthorized'
    ) {
      toast.error('You are not authorized to access this file')
      window.location.href = '/'
      return undefined
    }
    toast.error('Failed to fetch file details')
    return undefined
  }
}

const getTestTranscript = async( fileId: string, userId: number) => {
  try {
    
    if(!userId) {
      throw new Error('User ID not found')
    }
    const modifiedTranscript = await getModifiedTranscript(fileId, userId)
    
    if (modifiedTranscript) {
      return modifiedTranscript;
    }
    
    throw new Error('Modified test transcript not found');
  } catch (error) {
    return null;
  }
}

function getSRTVTT(alignments: AlignmentType[]) {
  try {
    if (!alignments?.length) {
      return null
    }

    let srt = ''
    let vtt = 'WEBVTT\r\n\r\n'
    let line: string[] = []
    let paraCount = 0
    let lastLineProcessed = false

    for (let i = 0; i < alignments.length; i++) {
      const current = alignments[i]
      const word = current.word
      const currentCase = current.case ?? 'success'
      const nextAlignment =
        i + 1 < alignments.length ? alignments[i + 1] : undefined

      line.push(word)

      if (!nextAlignment && line.length > 0) {
        const startTs = alignments[i - line.length + 1].start
        const endTs = current.end
        const srtTimestamp = `00:${secondsToTs(startTs, false, 3).replace(
          '.',
          ','
        )} --> 00:${secondsToTs(endTs, false, 3).replace('.', ',')}`
        const vttTimestamp = `00:${secondsToTs(startTs, false, 3)} --> 00:${secondsToTs(
          endTs, false, 3
        )}`

        paraCount++
        srt += `${paraCount}\r\n${srtTimestamp}\r\n${line
          .join(' ')
          .trim()}\r\n\r\n`
        vtt += `${vttTimestamp}\r\n${line.join(' ').trim()}\r\n\r\n`
        lastLineProcessed = true
        break
      }

      let forceBreak = false
      forceBreak =
        line.length > 10 &&
        !/\w/.test(word[word.length - 1]) &&
        currentCase === 'success'

      const shouldBreakOnGap =
        nextAlignment !== undefined &&
        line.length > 7 &&
        currentCase === 'success' &&
        (nextAlignment.case ?? 'success') === 'success' &&
        nextAlignment.start - current.end > 0.5

      forceBreak = forceBreak || shouldBreakOnGap
      forceBreak = forceBreak || (line.length > 12 && currentCase === 'success')
      forceBreak = forceBreak || line.join(' ').length > 70

      if (forceBreak) {
        const startTs = alignments[i - line.length + 1].start
        const endTs = current.end
        const srtTimestamp = `00:${secondsToTs(startTs, false, 3).replace(
          '.',
          ','
        )} --> 00:${secondsToTs(endTs, false, 3).replace('.', ',')}`
        const vttTimestamp = `00:${secondsToTs(startTs, false, 3)} --> 00:${secondsToTs(
          endTs, false, 3
        )}`

        paraCount++
        srt += `${paraCount}\r\n${srtTimestamp}\r\n${line
          .join(' ')
          .trim()}\r\n\r\n`
        vtt += `${vttTimestamp}\r\n${line.join(' ').trim()}\r\n\r\n`
        line = []
      }
    }

    if (line.length > 0 && !lastLineProcessed) {
      const startIndex = alignments.length - line.length
      const endIndex = alignments.length - 1
      const startTs = alignments[startIndex].start
      const endTs = alignments[endIndex].end
      const srtTimestamp = `00:${secondsToTs(startTs, false, 3).replace(
        '.',
        ','
      )} --> 00:${secondsToTs(endTs, false, 3).replace('.', ',')}`
      const vttTimestamp = `00:${secondsToTs(startTs, false, 3)} --> 00:${secondsToTs(
        endTs, false, 3
      )}`

      paraCount++
      srt += `${paraCount}\r\n${srtTimestamp}\r\n${line.join(' ').trim()}\r\n`
      vtt += `${vttTimestamp}\r\n${line.join(' ').trim()}\r\n`
    }

    return {
      srt,
      vtt,
    }
  } catch (error) {
    return null
  }
}

const generateSubtitles = async(fileId: string, currentAlignments: AlignmentType[]) => {
  if(!fileId || !currentAlignments) return

  if (
    currentAlignments &&
    Array.isArray(currentAlignments) &&
    currentAlignments.length > 0
  ) {
    const filteredAlignments = currentAlignments.filter(
      (alignment) => 'type' in alignment && alignment.type !== 'meta'
    )

    const subtitles = getSRTVTT(filteredAlignments)
    if (subtitles) {
      await uploadSubtitlesAction(fileId, subtitles)
    }
    return true
  }
  return false
}

type HandleSaveParams = {
  getEditorText: () => string
  orderDetails: OrderDetails
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>
  listenCount: number[]
  editedSegments: Set<number>
  isGeminiReviewed?: boolean
  isCF?: boolean
  role: string
  currentAlignments?: AlignmentType[]
  quill?: Quill // Add quill parameter
}

const handleSave = async (
  {
    getEditorText,
    orderDetails,
    setButtonLoading,
    listenCount,
    editedSegments,
    isGeminiReviewed = false,
    isCF = false,
    role,
    currentAlignments,
    quill, // Use the quill parameter
  }: HandleSaveParams,
  showToast = true
) => {
  setButtonLoading((prevButtonLoading) => ({
    ...prevButtonLoading,
    save: true,
  }))

  const toastId = showToast ? toast.loading(`Saving Transcription...`) : null

  try {
    const fileData = await getEditorDataIDB(orderDetails.fileId)
    if (!fileData || !fileData.transcript) {
      if (showToast) {
        return toast.error('Transcript is empty')
      }
      return
    }
    
    let transcript = fileData.transcript as string
    transcript = transcript.replace(/\n{3,}/g, '\n\n');
    await persistEditorDataIDB(orderDetails.fileId, { transcript });

    const paragraphs = transcript
      .split('\n')
      .filter((paragraph: string) => paragraph.trim() !== '')

    if (role !== 'CUSTOMER') {
      // Helper function to detect meta-only paragraphs
      const isMetaOnlyParagraph = (text: string) => {
        const trimmed = text.trim()
        return /^\[.*\]$/.test(trimmed)
      }

      const paragraphRegex = /^\d{1,2}:\d{2}:\d{2}\.\d\sS[\d?]+:/

      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i]
        // Skip validation for meta-only paragraphs
        if (isMetaOnlyParagraph(paragraph)) continue

        if (
          !paragraphRegex.test(paragraph) &&
          orderDetails.orderType === 'TRANSCRIPTION'
        ) {
          if (showToast) {
            if (toastId) toast.dismiss(toastId)
           
            if (quill) {
              const fullText = quill.getText()
              const paragraphRegex = new RegExp(escapeRegExp(paragraph), 'g')
              const match = paragraphRegex.exec(fullText)
              
              if (match) {
                quill.setSelection(match.index, paragraph.length)
                quill.formatText(match.index, paragraph.length, {
                  background: '#ffcdd2', 
                });
                
                scrollEditorToPos(quill, match.index)
              }
            }

            toast.error(
              'Invalid paragraph format detected. Each paragraph must start with a timestamp and speaker identification.'
            )
          }
          return
        }
      }
    }

    if (
      currentAlignments &&
      Array.isArray(currentAlignments) &&
      currentAlignments.length > 0 &&
      role === 'CUSTOMER'
    ) {
      const filteredAlignments = currentAlignments.filter(
        (alignment) => 'type' in alignment && alignment.type !== 'meta'
      )

      const subtitles = getSRTVTT(filteredAlignments)
      if (subtitles) {
        await uploadSubtitlesAction(orderDetails.fileId, subtitles)
      }
    }

    // Save notes and other data
    const tokenRes = await fileCacheTokenAction()
    const body: { [key: string]: string | number | boolean } = {
      fileId: orderDetails.fileId,
      transcript,
      isGeminiReviewed,
      isCF,
    }
    if (isCF) {
      let transcript = getEditorText()
      transcript = transcript.replace(/\n{3,}/g, '\n\n');
      body.transcript = transcript
      body.userId = Number(orderDetails.userId)
    }

    await axios.post(`${FILE_CACHE_URL}/save-transcript`, body, {
      headers: {
        Authorization: `Bearer ${tokenRes.token}`,
      },
    })

    await setPlayStatsAction({
      fileId: orderDetails.fileId,
      listenCount:
        fileData.listenCount && Array.isArray(fileData.listenCount)
          ? fileData.listenCount
          : listenCount,
      editedSegments: Array.from(editedSegments),
    })

    if (showToast) {
      if (toastId) toast.dismiss(toastId)
      const successToastId = toast.success(`Transcription saved successfully`)
      toast.dismiss(successToastId)
    }
  } catch (error) {
    if (showToast) {
      if (toastId) toast.dismiss(toastId)
      const errorToastId = toast.error(`Error while saving transcript`)
      toast.dismiss(errorToastId)
    }
  } finally {
    setButtonLoading((prevButtonLoading) => ({
      ...prevButtonLoading,
      save: false,
    }))
  }
}

function autoCapitalizeSentences(
  quillRef: React.RefObject<ReactQuill> | undefined,
  autoCapitalizeEnabled: boolean
) {
  if (!quillRef?.current || !autoCapitalizeEnabled) return
  const quill = quillRef.current.getEditor()
  const text = quill.getText()

  // 1. Handle lines that start with a timestamp and speaker label pattern,
  // e.g. "00:00:00.0 S1:" followed by a lowercase letter.
  const regexTimestampSpeaker = /^(\d{1,2}:\d{2}:\d{2}\.\d\sS\d+:)\s*([a-z])/gm
  let match: RegExpExecArray | null
  while ((match = regexTimestampSpeaker.exec(text)) !== null) {
    // match[0] is the whole matching string, e.g. "00:00:00.0 S1: hello"
    // match[1] is the timestamp & speaker label (e.g. "00:00:00.0 S1:")
    // match[2] is the first lowercase letter of the sentence ("h" in "hello")
    // Determine where the group2 begins relative to the document text.
    const fullMatch = match[0]
    const group2 = match[2]
    const group2Offset = fullMatch.indexOf(group2)
    const charIndex = match.index + group2Offset
    quill.deleteText(charIndex, 1, 'user')
    quill.insertText(charIndex, group2.toUpperCase(), 'user')
  }

  // 2. Auto capitalize after ! and ? (always capitalize these)
  const regexExclamationQuestion = /([!?])\s+([a-z])/g
  while ((match = regexExclamationQuestion.exec(text)) !== null) {
    const charIndex = match.index + match[0].length - 1
    quill.deleteText(charIndex, 1, 'user')
    quill.insertText(charIndex, match[2].toUpperCase(), 'user')
  }

  // 3. Handle periods with abbreviation checking
  const regexPeriod = /(\S+)\.\s+([a-z])/g
  while ((match = regexPeriod.exec(text)) !== null) {
    const wordBeforePeriod = match[1].toLowerCase()
    // Only capitalize if the word before period is not an abbreviation
    if (!COMMON_ABBREVIATIONS.has(wordBeforePeriod)) {
      const charIndex = match.index + match[0].length - 1
      quill.deleteText(charIndex, 1, 'user')
      quill.insertText(charIndex, match[2].toUpperCase(), 'user')
    }
  }
}

const checkTranscriptForAllowedMeta = (quill: Quill) => {
  if (!quill) return null

  const text = quill.getText()
  const regex = /\[([^\]]+)\](?!\s+____)/g
  let match
  let error = null

  while ((match = regex.exec(text)) !== null) {
    const content = match[1]
    if (!ALLOWED_META.includes(content.toLowerCase())) {
      const index = match.index
      const length = match[0].length

      quill.setSelection(index, length)
      quill.scrollIntoView()

      error = { message: 'IMT' }

      break
    }
  }

  if (error?.message) {
    throw new Error(error.message)
  }
}

type HandleSubmitParams = {
  orderDetails: OrderDetails
  step: string
  editorMode: string
  fileToUpload: {
    renamedFile: File | null
    originalFile: File | null
    isUploaded?: boolean
  }
  getPlayedPercentage: () => number
  router: {
    push: (path: string) => void
  }
  quill?: Quill
  finalizerComment: string
  currentAlignments?: AlignmentType[]
  qcValidation?: QCValidation
}

const handleSubmit = async ({
  orderDetails,
  step,
  editorMode,
  fileToUpload,  
  getPlayedPercentage,
  router,
  quill,
  finalizerComment,
  currentAlignments,
  qcValidation,
}: HandleSubmitParams) => {
  if (!orderDetails || !orderDetails.orderId || !step) return

  const transcript = quill?.getText() || ''

  try {
    if (orderDetails.orderType !== 'FORMATTING') {
      if (orderDetails.status === 'QC_ASSIGNED') {
        if (!quill) return
        checkTranscriptForAllowedMeta(quill)
      }
      const playedPercentage = getPlayedPercentage()
      if (playedPercentage < MINIMUM_AUDIO_PLAYBACK_PERCENTAGE) {
        throw new Error(`MAPPNM`) //Stands for "Minimum Audio Playback Percentage Not Met"
      }
    }

    if (step === 'CF') {
      if (!fileToUpload.isUploaded) throw new Error('UF')
      await submitReviewAction(
        Number(orderDetails.orderId),
        orderDetails.fileId,
        orderDetails.email,
        transcript,
        finalizerComment
      )
    } else {
      if (
        currentAlignments &&
        Array.isArray(currentAlignments) &&
        currentAlignments.length > 0
      ) {
        const filteredAlignments = currentAlignments.filter(
          (alignment) => 'type' in alignment && alignment.type !== 'meta'
        )

        const subtitles = getSRTVTT(filteredAlignments)
        if (subtitles) {
          await uploadSubtitlesAction(orderDetails.fileId, subtitles)
        }
      }

      await submitQCAction({
        orderId: Number(orderDetails.orderId),
        fileId: orderDetails.fileId,
        transcript,
        qcValidation,
      })
    }

    if (orderDetails.orderType === "TRANSCRIPTION" || (orderDetails.orderType === "TRANSCRIPTION_FORMATTING" && step === 'CF')) {
      // TODO: remove this after March 1st
      localStorage.removeItem('editorData')
      await deleteEditorDataIDB(orderDetails.fileId)
    }
  } catch (error) {
    setTimeout(() => {
      // toast.dismiss()
    }, 100) //Had to use this setTimeout because the minimum percentage check gives an error Immediately

    let errorText = 'Error while submitting transcript' // Default error message
    switch ((error as Error).message) {
      case 'MAPPNM':
        errorText = `Please make sure you have at least ${MINIMUM_AUDIO_PLAYBACK_PERCENTAGE}% of the audio played.`
        break
      case 'UF':
        errorText = `Please upload a file before submitting`
        break
      case 'IMT':
        errorText = `Invalid meta found in transcript. Please remove the meta from the transcript.`
      // Add more cases as needed
    }
    const errorToastId = toast.error(errorText)
    toast.dismiss(errorToastId)
    throw new Error(errorText)
  }
}

const getFrequentTermsHandler = async (
  userId: string,
  setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>,
  setFrequentTermsData: React.Dispatch<
    React.SetStateAction<{ autoGenerated: string; edited: string }>
  >,
  setFrequentTermsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setButtonLoading((prev) => ({ ...prev, frequentTerms: true }))

  try {
    const response = await getFrequentTermsAction(userId)
    if (response.success) {
      const data = {
        edited: response.edited ?? '',
        autoGenerated: response.autoGenerated ?? '',
      }
      setFrequentTermsData(data)
      setFrequentTermsModalOpen(true)
    } else {
      toast.error(response.message)
    }
  } catch (error) {
    toast.error('Failed to get frequent terms')
  } finally {
    setButtonLoading((prev) => ({ ...prev, frequentTerms: false }))
  }
}

const extractTimestamp = (text: string): number | null => {
  const match = text.match(/(\d{1,2}):(\d{2}):(\d{2}\.\d)/)
  if (match) {
    const [, hours, minutes, seconds] = match
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds)
  }
  return null
}

const playAudioAtTimestamp = (
  audioPlayer: HTMLAudioElement,
  timestamp: number
) => {
  audioPlayer.currentTime = timestamp
  audioPlayer.play()
}

const findParagraphStart = (quill: Quill, index: number): number => {
  let start = index
  while (start > 0 && quill.getText(start - 1, 1) !== '\n') {
    start--
  }
  return start
}

const navigateAndPlayBlanks = (
  quill: Quill,
  audioPlayer: HTMLAudioElement | null,
  goToPrevious = false
) => {
  if (!quill || !audioPlayer) return

  const text: string = quill.getText()
  const regex = /\[\d{1,2}:\d{2}:\d{2}\.\d\] ____/g
  const matches = Array.from(text.matchAll(regex))

  if (matches.length === 0) return

  let currentIndex = 0
  const selection = quill.getSelection()
  if (selection) {
    currentIndex = matches.findIndex((match, index) => {
      const nextMatch = matches[index + 1] || null
      return nextMatch
        ? selection.index >= match.index && selection.index < nextMatch.index
        : selection.index >= match.index
    })
  }

  currentIndex = goToPrevious
    ? currentIndex > 0
      ? currentIndex - 1
      : matches.length - 1
    : currentIndex >= 0 && currentIndex < matches.length - 1
    ? currentIndex + 1
    : 0

  const match = matches[currentIndex]
  if (!match) return

  quill.setSelection(match.index, match[0].length, 'silent')
  quill.scrollIntoView()

  const timestamp = extractTimestamp(match[0])
  if (timestamp !== null) {
    playAudioAtTimestamp(audioPlayer, timestamp)
  }
  
  toast.success(`Playing blank number ${currentIndex + 1} of ${matches.length}`)
}

const adjustTimestamps = (
  quill: Quill,
  adjustment: number,
  selection: { index: number; length: number } | null
) => {
  if (!quill) return

  if (!selection) {
    toast.error('Please select text to adjust timestamps.')
    return
  }

  const selectedText = quill.getText(selection.index, selection.length)
  if (!selectedText.trim()) {
    toast.error('Please select text to adjust timestamps.')
    return
  }

  const paragraphs = selectedText.split('\n\n')

  const adjustedText = paragraphs
    .map((paragraph) => {
      const timestamp = extractTimestamp(paragraph)
      if (timestamp !== null) {
        const adjustedTimestamp = timestamp + adjustment
        const newTimestamp = secondsToTs(adjustedTimestamp, true, 1)
        return paragraph.replace(/^\d{1,2}:\d{2}:\d{2}\.\d/, newTimestamp)
      }
      return paragraph
    })
    .join('\n\n')

  quill.deleteText(selection.index, selection.length, 'user')
  quill.insertText(selection.index, adjustedText, { bold: true }, 'user')

  toast.success('Timestamps adjusted successfully.')
}

const playCurrentParagraphTimestamp = (
  quill: Quill,
  audioPlayer: HTMLAudioElement | null
) => {
  if (!quill || !audioPlayer) return

  const selection = quill.getSelection()
  if (!selection) {
    toast.error('Please place the cursor in a paragraph.')
    return
  }

  const paragraphStart = findParagraphStart(quill, selection.index)
  const paragraphText = quill.getText(paragraphStart, 50)
  const timestamp = extractTimestamp(paragraphText)

  if (timestamp !== null) {
    playAudioAtTimestamp(audioPlayer, timestamp)
  } else {
    toast.error('No timestamp found at the start of this paragraph.')
  }
}

const clearAllHighlights = (quill: Quill): void => {
  if (!quill) return;
  
  const text = quill.getText();
  quill.formatText(0, text.length, {
    background: false,  // Remove background formatting from the entire document
  });
};

export interface CustomerQuillSelection {
  index: number
  length: number
}

const escapeRegExp = (string: string): string => (
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
)

const searchAndSelect = (
  quill: Quill,
  searchText: string,
  matchCase: boolean,
  lastSearchIndex: number,
  setLastSearchIndex: (index: number) => void,
  toastInstance: { error: (msg: string) => void },
  selection: { index: number; length: number } | null,
  setSelection: (selection: { index: number; length: number } | null) => void,
  matchSelection: boolean,
  searchBackwards: boolean = false,
  setSearchHighlight: (highlight: CustomerQuillSelection | null) => void
) => {
  if (!quill || !searchText) return

  const searchRange = {
    start: 0,
    end: quill.getText().length,
  }

  // If there's a selection, limit search to that range
  if (selection && selection.length > 0 && matchSelection) {
    searchRange.start = selection.index
    searchRange.end = selection.index + selection.length
  }

  // Get the text content to search within
  const text = quill.getText(
    searchRange.start,
    searchRange.end - searchRange.start
  )
   
  // Reset previous active highlight if valid
  if (lastSearchIndex >= 0 && lastSearchIndex < quill.getText().length) {
    try {
      // Only attempt to format if the index is in bounds
      const docLength = quill.getText().length;
      if (lastSearchIndex + searchText.length <= docLength) {
        quill.formatText(lastSearchIndex, searchText.length, {
          background: '#ffeb3b', // Change back to yellow for previous active match
        });
      }
    } catch (e) {
      console.error('Error formatting previous highlight:', e);
    }
  }

  const effectiveSearchText = matchCase ? searchText : searchText.toLowerCase()
  
  // Create regex pattern for exact matching
  const searchRegex = matchCase 
    ? new RegExp(`\\b${escapeRegExp(effectiveSearchText)}\\b|${escapeRegExp(effectiveSearchText)}`, 'g')
    : new RegExp(`\\b${escapeRegExp(effectiveSearchText)}\\b|${escapeRegExp(effectiveSearchText)}`, 'gi');
  
  // Find all matches
  const matches: number[] = [];
  let match;
  const textToSearch = matchCase ? text : text.toLowerCase();
  
  // Get all matches first
  while ((match = searchRegex.exec(textToSearch)) !== null) {
    matches.push(match.index + searchRange.start);
  }
  
  if (matches.length === 0) {
    setLastSearchIndex(-1)
    setSearchHighlight(null)
    toastInstance.error('Text not found in selected range')
    return;
  }
  
  // Find the appropriate match based on the last position and direction
  let nextMatchIndex = -1;
  
  if (searchBackwards) {
    // When searching backwards, find the last match before lastSearchIndex
    for (let i = matches.length - 1; i >= 0; i--) {
      if (matches[i] < lastSearchIndex || lastSearchIndex === -1) {
        nextMatchIndex = matches[i];
        break;
      }
    }
    
    // If no match found, wrap around to the end
    if (nextMatchIndex === -1 && matches.length > 0) {
      nextMatchIndex = matches[matches.length - 1];
    }
  } else {
    // When searching forwards, find the first match after lastSearchIndex
    for (let i = 0; i < matches.length; i++) {
      if (matches[i] > lastSearchIndex || lastSearchIndex === -1) {
        nextMatchIndex = matches[i];
        break;
      }
    }
    
    // If no match found, wrap around to the beginning
    if (nextMatchIndex === -1 && matches.length > 0) {
      nextMatchIndex = matches[0];
    }
  }
  
  if (nextMatchIndex !== -1) {
    // Apply active highlight (blue) for the current match
    quill.formatText(nextMatchIndex, searchText.length, {
      background: '#b3d4fc',
    })

    // Store the current search highlight
    setSearchHighlight({ index: nextMatchIndex, length: searchText.length })

    // Scroll the highlighted text into view
    const bounds = quill.getBounds(nextMatchIndex)
    const editorElement = quill.root
    const scrollingContainer = editorElement.closest('.ql-editor')
    if (scrollingContainer && bounds) {
      const containerRect = scrollingContainer.getBoundingClientRect()
      const scrollTop =
        bounds.top + scrollingContainer.scrollTop - containerRect.height / 2
      scrollingContainer.scrollTop = scrollTop
    }

    setLastSearchIndex(nextMatchIndex)
  } else {
    setLastSearchIndex(-1)
    setSearchHighlight(null)
    toastInstance.error('Text not found in selected range')
  }

  setSelection(selection)
}

const replaceTextHandler = (
  quill: Quill,
  searchText: string,
  replaceWith: string,
  replaceAll: boolean,
  matchCase: boolean,
  toastInstance: { error: (msg: string) => void },
  selection: { index: number; length: number } | null,
  matchSelection: boolean
) => {
  if (!quill || !searchText) return

  const searchRange = {
    start: 0,
    end: quill.getText().length,
  }

  // If there's a selection and matchSelection is enabled, limit search to that range
  if (selection && selection.length > 0 && matchSelection) {
    searchRange.start = selection.index
    searchRange.end = selection.index + selection.length
  }

  const text = quill.getText(
    searchRange.start,
    searchRange.end - searchRange.start
  )
  const effectiveSearchText = matchCase ? searchText : searchText.toLowerCase()
  const textToSearch = matchCase ? text : text.toLowerCase()

  // Find all matches
  const matches: number[] = []
  const searchRegex = matchCase
    ? new RegExp(`\\b${escapeRegExp(effectiveSearchText)}\\b|${escapeRegExp(effectiveSearchText)}`, 'g')
    : new RegExp(`\\b${escapeRegExp(effectiveSearchText)}\\b|${escapeRegExp(effectiveSearchText)}`, 'gi')

  let match
  while ((match = searchRegex.exec(textToSearch)) !== null) {
    matches.push(match.index + searchRange.start)
  }

  if (matches.length === 0) {
    toastInstance.error('Text not found')
    return
  }

  if (replaceAll) {
    // Sort matches in reverse order to prevent index shifting
    const sortedMatches = [...matches].sort((a, b) => b - a)

    // Replace all matches, starting from the end
    for (const matchIndex of sortedMatches) {
      quill.deleteText(matchIndex, searchText.length)
      quill.insertText(matchIndex, replaceWith)
    }

    toastInstance.error(`Replaced ${matches.length} occurrences`)
  } else {
    // Find next match after the current cursor position
    const currentIndex = quill.getSelection()?.index || 0
    let nextMatchIndex = -1

    for (let i = 0; i < matches.length; i++) {
      if (matches[i] >= currentIndex) {
        nextMatchIndex = matches[i]
        break
      }
    }

    // If no match found after cursor, wrap around to the beginning
    if (nextMatchIndex === -1 && matches.length > 0) {
      nextMatchIndex = matches[0]
    }

    if (nextMatchIndex !== -1) {
      quill.deleteText(nextMatchIndex, searchText.length)
      quill.insertText(nextMatchIndex, replaceWith)
      quill.setSelection(nextMatchIndex + replaceWith.length, 0)
      
    }
  }
}

const insertTimestampAndSpeaker = (
  audioPlayer: HTMLAudioElement | null,
  quill: Quill | undefined
) => {
  if (!audioPlayer || !quill) return

  const currentTime = audioPlayer.currentTime
  const formattedTime = convertSecondsToTimestamp(currentTime)
  const currentSelection = quill.getSelection()

  let paragraphStart = currentSelection ? currentSelection.index : 0
  while (paragraphStart > 0 && quill.getText(paragraphStart - 1, 1) !== '\n') {
    paragraphStart--
  }

  // Check and remove any existing timestamp and speaker pattern at the start of the line
  const lineText = quill.getText(paragraphStart, 14)
  const timestampSpeakerPattern = /^\d{1}:\d{2}:\d{2}\.\d{1} S\d+: /
  if (timestampSpeakerPattern.test(lineText)) {
    const match = lineText.match(timestampSpeakerPattern)
    if (match) {
      quill.deleteText(paragraphStart, match[0].length, 'user')
    }
  }

  // Insert the bold part (formatted time and speaker label without trailing space)
  const boldPart = formattedTime + ' S1:'
  quill.insertText(paragraphStart, boldPart, { bold: true }, 'user')

  // Insert a space after the colon with normal formatting to reset bold style
  const nonBoldPart = ' '
  quill.insertText(
    paragraphStart + boldPart.length,
    nonBoldPart,
    { bold: false },
    'user'
  )

  // Set selection to the speaker number for easy editing (selects the digit in "S1")
  const speakerNumberStart = paragraphStart + formattedTime.length + 2 // +2 for " S"
  quill.setSelection(speakerNumberStart, 1)
}

const insertTimestampBlankAtCursorPosition = (
  audioPlayer: HTMLAudioElement | null,
  quill: Quill | undefined
) => {
  if (!audioPlayer || !quill) return

  const cursorPosition = quill.getSelection()?.index || 0

  // Check if cursor is at start of paragraph
  let isStartOfParagraph = true
  if (cursorPosition > 0) {
    const textBeforeCursor = quill.getText(cursorPosition - 1, 1)
    if (textBeforeCursor !== '\n') {
      isStartOfParagraph = false
    }
  }

  if (isStartOfParagraph) {
    // Call the other function instead
    insertTimestampAndSpeaker(audioPlayer, quill)
    return
  }

  const currentTime = audioPlayer.currentTime
  const formattedTime = `[${secondsToTs(currentTime, true, 1)}] ____`

  // Insert the blank with the red color style.
  quill.insertText(cursorPosition, formattedTime, { color: '#FF0000' }, 'user')

  // Reset the text format so that new text is not red.
  quill.format('color', false)
  
  // Space added after reverting back to default color.
  quill.insertText(cursorPosition + formattedTime.length, ` `, 'user')
  // Set the selection after the inserted text.
  quill.setSelection(cursorPosition + formattedTime.length + 1, 0)
  // Count total blanks in the transcript and show toast message with updated blank count
  const text = quill.getText()
  const regex = /\[\d{1,2}:\d{2}:\d{2}\.\d\] ____/g
  const matches = Array.from(text.matchAll(regex))  
  toast.success(`Blank added. Total blanks: ${matches.length}`)
}

const scrollEditorToPos = (quill: Quill, pos: number) => {
  const [line] = quill.getLine(pos)
  if (!line) return

  const lineOffset = line.offset()
  const bounds = quill.getBounds(lineOffset)
  if (!bounds) return

  const editorContainer = quill.root.closest('.ql-editor')
  if (!editorContainer) return

  // Get positions relative to editor container
  const rect = line.domNode.getBoundingClientRect()
  const containerRect = editorContainer.getBoundingClientRect()

  // Check if line's bottom is beyond 80% of container height
  const lineBottomRelative = rect.bottom - containerRect.top
  const threshold = containerRect.height * 0.8

  if (lineBottomRelative > threshold) {
    editorContainer.scrollTo({
      top: editorContainer.scrollTop + bounds.top - 50, // scroll to put line near top
      behavior: 'smooth',
    })
  }
}

function getFormattedContent(text: string): Op[] {
  const formattedContent: Op[] = []
  let lastIndex = 0

  // Update pattern to explicitly include the timestamp+blank pattern
  const pattern =
    /((?:^|\n)(?:\d{1,2}:\d{2}:\d{2}\.\d(?:\s+(?:S\d+:|Speaker\s?\d+:|[A-Za-z][A-Za-z\s]*:))?|S\d+:|Speaker\s?\d+:|[A-Za-z][A-Za-z\s]*:))|(\[\d{1,2}:\d{2}:\d{2}\.\d\](?:\s+____)?|\[[^\]]+\])/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      formattedContent.push({ insert: text.slice(lastIndex, match.index) })
    }

    const matchedText = match[0]

    // Rule 1: TS + Speaker labels or standalone speaker labels
    if (
      match[1] &&
      (matchedText.match(/\d{1,2}:\d{2}:\d{2}\.\d/) ||
        matchedText.match(/(?:S\d+:|Speaker\s?\d+:|[A-Za-z][A-Za-z\s]*:)/))
    ) {
      if (matchedText.startsWith('\n')) {
        formattedContent.push({ insert: '\n' })
        formattedContent.push({
          insert: matchedText.substring(1),
          attributes: { bold: true },
        })
      } else {
        formattedContent.push({
          insert: matchedText,
          attributes: { bold: true },
        })
      }
    }
    // Rule 2: TS + blank (complete pattern)
    else if (matchedText.match(/\[\d{1,2}:\d{2}:\d{2}\.\d\]\s+____/)) {
      formattedContent.push({
        insert: matchedText,
        attributes: { color: '#FF0000' },
      })
    }
    // Rule 3: Any other bracketed content
    else if (matchedText.startsWith('[')) {
      formattedContent.push({
        insert: matchedText,
        attributes: { background: '#f5f5f5', color: '#4A4A4A' },
      })
    }

    lastIndex = match.index + matchedText.length
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText.trim().length > 0 && !remainingText.endsWith('\n')) {
      formattedContent.push({ insert: remainingText + '\n' })
    } else {
      formattedContent.push({ insert: remainingText })
    }
  } else if (formattedContent.length > 0) {
    const lastOperation = formattedContent[formattedContent.length - 1]
    if (
      typeof lastOperation.insert === 'string' &&
      lastOperation.insert.trim().length > 0 &&
      !lastOperation.insert.endsWith('\n')
    ) {
      lastOperation.insert += '\n'
    }
  }

  return formattedContent
}

function timestampToSeconds(timestamp: string): number {
  const [hours, minutes, seconds] = timestamp.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

export interface TranscriptSegment {
  content: string
  speaker: string
  timestamp: string
}

export interface ChunkData {
  fileKey: string
  startTime: number
  endTime: number
  transcript: string
}

function parseTranscript(transcript: string): TranscriptSegment[] {
  const lines = transcript.split('\n').filter((line) => line.trim())
  return lines.map((line) => {
    const match = line.match(/^(\d{1,2}:\d{1,2}(?::\d{1,2}(?:\.\d+)?)?)\s+([A-Za-z][\w\s\.']*)\s*:\s*(.+)$/)
    if (!match) throw new Error(`Invalid line format: ${line}`)
    return {
      timestamp: match[1],
      speaker: match[2],
      content: match[3],
    }
  })
}

function findOptimalChunkPoints(segments: CTMType[]): number[] {
  if (segments.length === 0) return []

  const config = {
    maxDuration: 1500,
    minPauseDuration: 0.5,
    minConfidence: 0.6,
    maxWordsPerChunk: 300,
  }

  const chunkPoints: number[] = [segments[0].start]
  let currentChunkStart = segments[0].start

  for (let i = 0; i < segments.length - 1; i++) {
    const currentSegment = segments[i]
    const nextSegment = segments[i + 1]
    const currentDuration = nextSegment.start - currentChunkStart
    const pauseDuration = nextSegment.start - currentSegment.end
    const isSpeakerChange = currentSegment.speaker !== nextSegment.speaker

    if (
      currentDuration >= config.maxDuration &&
      isSpeakerChange &&
      pauseDuration >= config.minPauseDuration
    ) {
      chunkPoints.push(currentSegment.end)
      currentChunkStart = nextSegment.start
    }
  }

  if (segments.length > 0) chunkPoints.push(segments[segments.length - 1].end)

  const finalChunkPoints = chunkPoints.filter((point, index) => {
    if (index === 0 || index === chunkPoints.length - 1) return true
    const duration = chunkPoints[index + 1] - point
    return duration >= config.minPauseDuration
  })
  finalChunkPoints[0] = 0
  return finalChunkPoints
}

function chunkTranscript(transcript: string, chunkPoints: number[]): string[] {
  try{
    const entries = parseTranscript(transcript)
    const sortedPoints = [...chunkPoints].sort((a, b) => a - b)
    const chunks: string[] = []
    for (let i = 0; i < sortedPoints.length - 1; i++) {
    const chunkStart = sortedPoints[i]
    const chunkEnd = sortedPoints[i + 1]
    const chunkEntries = entries.filter((entry) => {
      const entryTime = timestampToSeconds(entry.timestamp)
      return entryTime >= chunkStart && entryTime < chunkEnd
    })
    if (chunkEntries.length > 0) {
      chunks.push(
        chunkEntries
          .map(
            (entry) => `${entry.timestamp} ${entry.speaker}: ${entry.content}`
          )
          .join('\n')
        )
      }
    }
    return chunks
  } catch (error) {
    return []
  }
}

function secondsToTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  seconds %= 3600
  const minutes = Math.floor(seconds / 60)
  seconds = Math.round((seconds % 60) * 10) / 10 // Round to 1 decimal place

  return `${hours}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(1)}`
}

function parseTranscriptLine(line: string): TranscriptSegment | null {
  const match = line.match(/^(\d+:\d+:\d+\.\d+)\s+(S\d+)\s*:\s*(.+)$/)
  if (!match) return null

  return {
    timestamp: match[1],
    speaker: match[2],
    content: match[3],
  }
}

function offsetTranscript(
  transcript: string,
  offsetTimestamp: string | null = null
): { transcript: string; firstTimeStamp: string } | string {
  const lines = transcript.split('\n').filter((line) => line.trim())
  if (lines.length === 0) return ''

  // Find the first timestamp
  const firstUtterance = parseTranscriptLine(lines[0])
  if (!firstUtterance) return transcript

  const offsetSeconds = offsetTimestamp
    ? timestampToSeconds(offsetTimestamp)
    : timestampToSeconds(firstUtterance.timestamp)
  // Process each line
  const formattedTranscript = lines
    .map((line) => {
      const utterance = parseTranscriptLine(line)
      if (!utterance) return line

      const originalSeconds = timestampToSeconds(utterance.timestamp)
      const newSeconds = offsetTimestamp
        ? originalSeconds + offsetSeconds
        : originalSeconds - offsetSeconds
      const newTimestamp = secondsToTimestamp(newSeconds)

      return `${newTimestamp} ${utterance.speaker}: ${utterance.content}`
    })
    .join('\n')

  return offsetTimestamp
    ? formattedTranscript
    : {
        transcript: formattedTranscript,
        firstTimeStamp: firstUtterance.timestamp,
      }
}

export interface DiffSegment {
  type: typeof DIFF_DELETE | typeof DIFF_INSERT | typeof DIFF_EQUAL
  text: string
}

function formatTimestamps(text: string): string {
  // Pass 1: Insert a newline before every timestamp that doesn't already have one.
  // Updated regex to match timestamps with 1 or 2 digits for seconds.
  const textWithNewlines = text.replace(
    /(?<!^)(?<!\n\n)(\d{1,2}:\d{2}:\d{1,2}(?:\.\d+)?)/g,
    '\n$1'
  )

  // Pass 2: Reformat each timestamp to follow h:mm:ss.ms format, ensuring seconds are two digits.
  const formatted = textWithNewlines.replace(
    /^(\d{1,2}):(\d{2}):(\d{1,2})(?:\.(\d+))?/gm,
    (_match, hour, minute, second, fraction) => {
      const normalizedHour = Number(hour).toString() // Remove any leading zeros for hour.
      const paddedMinute = minute.padStart(2, '0') // Ensure minute is two digits.
      const paddedSecond = second.padStart(2, '0') // Pad seconds if necessary.
      const fractionDigit = fraction ? fraction.charAt(0) : '0' // Exactly one decimal digit.
      return `${normalizedHour}:${paddedMinute}:${paddedSecond}.${fractionDigit}`
    }
  )
  return formatted.trim()
}

/**
 * Accepts all pending diffs by marking them as equal.
 * For a DIFF_DELETE followed by a DIFF_INSERT, the insertion text (Gemini's suggestion)
 * is kept. Standalone diffs are simply converted to equal type.
 */
function acceptAllDiffs(diffs: DiffSegment[]): DiffSegment[] {
  const newDiffs: DiffSegment[] = []
  let i = 0
  while (i < diffs.length) {
    const diff = diffs[i]
    // If deletion is immediately followed by insertion, merge into Gemini text.
    if (
      diff.type === DIFF_DELETE &&
      i + 1 < diffs.length &&
      diffs[i + 1].type === DIFF_INSERT
    ) {
      newDiffs.push({ type: DIFF_EQUAL, text: diffs[i + 1].text })
      i += 2
    } else if (diff.type === DIFF_INSERT || diff.type === DIFF_DELETE) {
      newDiffs.push({ type: DIFF_EQUAL, text: diff.text })
      i++
    } else {
      newDiffs.push(diff)
      i++
    }
  }
  return newDiffs
}

/**
 * Rejects all pending diffs by discarding Gemini's changes.
 * For a DIFF_DELETE followed by a DIFF_INSERT, the original text (the deletion content)
 * is retained. Standalone DIFF_INSERTs are dropped.
 */
function rejectAllDiffs(diffs: DiffSegment[]): DiffSegment[] {
  const newDiffs: DiffSegment[] = []
  let i = 0
  while (i < diffs.length) {
    const diff = diffs[i]
    if (
      diff.type === DIFF_DELETE &&
      i + 1 < diffs.length &&
      diffs[i + 1].type === DIFF_INSERT
    ) {
      // Retain the original text from the deletion segment.
      newDiffs.push({ type: DIFF_EQUAL, text: diff.text })
      i += 2
    } else if (diff.type === DIFF_INSERT) {
      // Drop any unpaired insertions.
      i++
    } else if (diff.type === DIFF_DELETE) {
      newDiffs.push({ type: DIFF_EQUAL, text: diff.text })
      i++
    } else {
      newDiffs.push(diff)
      i++
    }
  }
  return newDiffs
}

function calculateBlankPercentage(
  transcript: string,
  alignments: AlignmentType[]
): number {
  const blankPattern = /\[\d{1,2}:\d{2}:\d{2}\.\d\]\s+____/g
  const matches = transcript.match(blankPattern) || []
  const blankCount = matches.length

  const contentWordCount = alignments.filter((al) => al.type === 'ctm').length

  if (contentWordCount === 0) return 0
  
  const blankPercentage = Math.round((blankCount / contentWordCount) * 100)
  return (blankCount / contentWordCount) > 0 && blankPercentage === 0 ? 1 : blankPercentage
}

function calculateEditListenCorrelationPercentage(
  listenCount: number[],
  editedSegments: Set<number>
): number {
  if (editedSegments.size === 0) return 100

  let correlatedEdits = 0
  editedSegments.forEach((segment) => {
    if (
      (segment >= 0 &&
        segment < listenCount.length &&
        listenCount[segment] >= QC_VALIDATION.min_listen_count_threshold) ||
      (segment - 1 >= 0 && listenCount[segment - 1] >= QC_VALIDATION.min_listen_count_threshold) ||
      (segment + 1 < listenCount.length &&
        listenCount[segment + 1] >= QC_VALIDATION.min_listen_count_threshold)
    ) {
      correlatedEdits++
    }
  })

  return Math.round((correlatedEdits / editedSegments.size) * 100)
}

function calculateSpeakerChangePercentage(
  originalTranscript: string,
  editedTranscript: string
): number {
  const speakerLabelRegex = /\d{1,2}:\d{2}:\d{2}\.\d\s+(S\d+):/g
  const FUZZY_MATCH_THRESHOLD = 0.5

  const originalLabels: { [key: string]: string } = {}
  const editedLabels: { [key: string]: string } = {}
  const processedTimestamps = new Set<string>()

  let match
  while ((match = speakerLabelRegex.exec(originalTranscript)) !== null) {
    const timestamp = match[0].split(' ')[0]
    const speakerLabel = match[1]
    originalLabels[timestamp] = speakerLabel
  }

  speakerLabelRegex.lastIndex = 0

  while ((match = speakerLabelRegex.exec(editedTranscript)) !== null) {
    const timestamp = match[0].split(' ')[0]
    const speakerLabel = match[1]
    editedLabels[timestamp] = speakerLabel
  }

  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':')
    const seconds = 
      parseInt(parts[0]) * 3600 + 
      parseInt(parts[1]) * 60 + 
      parseFloat(parts[2])
    return seconds
  }

  const findClosestTimestamp = (timestamp: string, targetObj: { [key: string]: string }): string | null => {
    const timeInSeconds = timestampToSeconds(timestamp)
    let closestMatch: string | null = null
    let minDifference = FUZZY_MATCH_THRESHOLD + 0.1
    
    for (const targetTimestamp in targetObj) {
      if (processedTimestamps.has(targetTimestamp)) continue
      
      const targetTimeInSeconds = timestampToSeconds(targetTimestamp)
      const difference = Math.abs(timeInSeconds - targetTimeInSeconds)
      
      if (difference < FUZZY_MATCH_THRESHOLD && difference < minDifference) {
        minDifference = difference
        closestMatch = targetTimestamp
      }
    }
    
    return closestMatch
  }

  let changedCount = 0
  let addedCount = 0
  let removedCount = 0
  const totalOriginalCount = Object.keys(originalLabels).length

  for (const origTimestamp in originalLabels) {
    if (editedLabels[origTimestamp]) {
      if (originalLabels[origTimestamp] !== editedLabels[origTimestamp]) {
        changedCount++
      }
      processedTimestamps.add(origTimestamp)
    } else {
      const closestMatch = findClosestTimestamp(origTimestamp, editedLabels)
      if (closestMatch) {
        if (originalLabels[origTimestamp] !== editedLabels[closestMatch]) {
          changedCount++
        }
        processedTimestamps.add(closestMatch)
      } else {
        removedCount++
      }
    }
  }

  for (const editedTimestamp in editedLabels) {
    if (!processedTimestamps.has(editedTimestamp)) {
      addedCount++
    }
  }

  const totalChanges = changedCount + addedCount + removedCount
  
  return totalOriginalCount > 0 ? Math.round((totalChanges / totalOriginalCount) * 100) : 0
}

function calculateSpeakerMacroF1Score(
  originalTranscript: string,
  editedTranscript: string
): number {
  const extractSpeakerSegments = (transcript: string) => {
    const segments: { timestamp: string; speaker: string; text: string }[] = []
    const lines = transcript
      .split('\n')
      .filter((line) => line.trim().length > 0)

    for (const line of lines) {
      const match = line.match(/^(\d{1,2}:\d{2}:\d{2}\.\d)\s+(S\d+):\s+(.+)$/)
      if (match) {
        segments.push({
          timestamp: match[1],
          speaker: match[2],
          text: match[3].trim(),
        })
      }
    }

    return segments
  }

  const originalSegments = extractSpeakerSegments(originalTranscript)
  const editedSegments = extractSpeakerSegments(editedTranscript)

  if (originalSegments.length === 0 || editedSegments.length === 0) {
    return 0
  }

  const FUZZY_MATCH_THRESHOLD = 0.5
  const findMatchingSegment = (segment: typeof originalSegments[0], targetSegments: typeof editedSegments) => {
    const exactMatch = targetSegments.find(s => s.timestamp === segment.timestamp)
    if (exactMatch) return exactMatch

    const segmentTime = timestampToSeconds(segment.timestamp)
    let closestMatch = null
    let minDifference = FUZZY_MATCH_THRESHOLD
    
    for (const targetSegment of targetSegments) {
      const targetTime = timestampToSeconds(targetSegment.timestamp)
      const difference = Math.abs(segmentTime - targetTime)
      
      if (difference < minDifference) {
        minDifference = difference
        closestMatch = targetSegment
      }
    }
    
    return closestMatch
  }

  const allSpeakers = Array.from(
    new Set([
      ...originalSegments.map((s) => s.speaker),
      ...editedSegments.map((s) => s.speaker),
    ])
  ).sort()

  const speakerStats = new Map<string, { tp: number; fp: number; fn: number }>()
  allSpeakers.forEach(speaker => {
    speakerStats.set(speaker, { tp: 0, fp: 0, fn: 0 })
  })

  const processedEditedIndices = new Set<number>()

  for (const originalSegment of originalSegments) {
    const matchingEditedSegmentIndex = editedSegments.findIndex((segment, index) => {
      if (processedEditedIndices.has(index)) return false
      const matchedSegment = findMatchingSegment(originalSegment, [segment])
      return matchedSegment !== null
    })

    if (matchingEditedSegmentIndex !== -1) {
      const editedSegment = editedSegments[matchingEditedSegmentIndex]
      processedEditedIndices.add(matchingEditedSegmentIndex)
      
      if (originalSegment.speaker === editedSegment.speaker) {
        const stats = speakerStats.get(originalSegment.speaker)!
        stats.tp += 1
      } else {
        const origStats = speakerStats.get(originalSegment.speaker)!
        origStats.fn += 1
        
        const editStats = speakerStats.get(editedSegment.speaker)!
        editStats.fp += 1
      }
    } else {
      const stats = speakerStats.get(originalSegment.speaker)!
      stats.fn += 1
    }
  }

  editedSegments.forEach((segment, index) => {
    if (!processedEditedIndices.has(index)) {
      const stats = speakerStats.get(segment.speaker)!
      stats.fp += 1
    }
  })

  const f1Scores: number[] = []
  
  for (const speaker of allSpeakers) {
    const { tp, fp, fn } = speakerStats.get(speaker)!
    
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp)
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn)
    
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
    f1Scores.push(f1)
  }

  const macroF1 = f1Scores.length > 0
    ? f1Scores.reduce((sum, score) => sum + score, 0) / f1Scores.length
    : 0
    
  return Number(macroF1.toFixed(2))
}

const getOptimalInterval = (duration: number): number => {
  const hours = duration / 3600;
  
  if (hours <= 0.5) return 300;     // 5 min intervals for <= 30 mins
  if (hours <= 1) return 600;       // 10 min intervals for <= 1 hour
  if (hours <= 2) return 900;       // 15 min intervals for <= 2 hours
  if (hours <= 3) return 1800;      // 30 min intervals for <= 3 hours
  if (hours <= 6) return 3600;      // 1 hour intervals for <= 6 hours
  return 7200;                      // 2 hour intervals for > 6 hours
};

export enum GeminiModel {
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GEMINI_2_0_FLASH = 'gemini-2.0-flash',
}

export {
  generateRandomColor,
  convertBlankToSeconds,
  convertTimestampToSeconds,
  updatePlayedPercentage,
  scrollEditorToPos,
  convertSecondsToTimestamp,
  downloadMP3,
  handleTextFilesUpload,
  uploadTextFile,
  uploadFile,
  uploadFormattingFiles,
  getMaxFormatFiles,
  handleFilesUpload,
  regenDocx,
  reportHandler,
  fetchFileDetails,
  handleSave,
  handleSubmit,
  getFrequentTermsHandler,
  adjustTimestamps,
  playCurrentParagraphTimestamp,
  navigateAndPlayBlanks,
  searchAndSelect,
  replaceTextHandler,
  insertTimestampBlankAtCursorPosition,
  insertTimestampAndSpeaker,
  autoCapitalizeSentences,
  getFormattedContent,
  parseTranscript,
  findOptimalChunkPoints,
  chunkTranscript,
  timestampToSeconds,
  parseTranscriptLine,
  secondsToTimestamp,
  offsetTranscript,
  formatTimestamps,
  acceptAllDiffs,
  rejectAllDiffs,
  calculateBlankPercentage,
  calculateEditListenCorrelationPercentage,
  calculateSpeakerChangePercentage,
  calculateSpeakerMacroF1Score,
  getTestTranscript,
  escapeRegExp,
  clearAllHighlights,
  generateSubtitles,
  getOptimalInterval,
}
export type { CTMType }