/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import { Session } from 'next-auth'
import Quill from 'quill'
import ReactQuill from 'react-quill'
import { toast } from 'sonner'

import axiosInstance from './axios'
import { CTMType } from './getFormattedTranscript'
import { secondsToTs } from './secondsToTs'
import { getFrequentTermsAction } from '@/app/actions/editor/frequent-terms'
import { getOrderDetailsAction } from '@/app/actions/editor/order-details'
import { reportFileAction } from '@/app/actions/editor/report-file'
import { submitQCAction } from '@/app/actions/editor/submit-qc'
import { submitReviewAction } from '@/app/actions/editor/submit-review'
import { uploadDocxAction } from '@/app/actions/editor/upload-docx'
import { getSignedUrlAction } from '@/app/actions/get-signed-url'
import { OrderDetails, UploadFilesType } from '@/app/editor/[fileId]/page'
import {
    ALLOWED_META,
    BACKEND_URL,
    FILE_CACHE_URL,
    MINIMUM_AUDIO_PLAYBACK_PERCENTAGE,
} from '@/constants'

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

const convertSecondsToTimestamp = (seconds: number) => secondsToTs(seconds, true, 1);

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
    const toastId = toast.loading('Uploading File...')
    setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        upload: true,
    }))

    const formData = new FormData()
    formData.append('file', file)
    try {
        const response = await uploadDocxAction(formData, fileId)

        toast.dismiss(toastId)
        if (response.success) {
            toast.success("File uploaded successfully")
            setFileToUpload({ renamedFile: null, originalFile: null, isUploaded: true })
        } else {
            throw new Error(response.message)
        }
    } catch (uploadError) {
        toast.dismiss(toastId)
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

const handleFilesUpload = async (
    payload: UploadFilesType,
    orderDetailsId: string,
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

        if (
            payload.files[0].type !==
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            toast.error('Only docx files can be uploaded.')
            return
        }
        const file = payload.files[0]
        const renamedFile = new File([file], `${orderDetailsId}.docx`, {
            type: file.type,
        })
        setFileToUpload({ renamedFile, originalFile: file })
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
    setOrderDetails: React.Dispatch<React.SetStateAction<OrderDetails>>
    setCfd: React.Dispatch<React.SetStateAction<string>>
    setStep: React.Dispatch<React.SetStateAction<string>>
    setTranscript: React.Dispatch<React.SetStateAction<string>>
    setCtms: React.Dispatch<React.SetStateAction<CTMType[]>>
    setPlayerEvents: React.Dispatch<React.SetStateAction<PlayerEvent[]>>
}

const fetchFileDetails = async ({
    params,
    setOrderDetails,
    setCfd,
    setStep,
    setTranscript,
    setCtms,
    setPlayerEvents,
}: FetchFileDetailsParams) => {
    try {
        const orderRes = await getOrderDetailsAction(params?.fileId as string)
        if (!orderRes?.orderDetails) {
            throw new Error('Order details not found')
        }

        const orderDetailsFormatted = {
            ...orderRes.orderDetails,
            orderId: orderRes.orderDetails.orderId.toString(),
            userId: orderRes.orderDetails.userId.toString(),
            duration: orderRes.orderDetails.duration || '',
        }
        setOrderDetails(orderDetailsFormatted)
        setCfd(orderRes.orderDetails.cfd)
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
            if (orderRes.orderDetails.orderType === 'TRANSCRIPTION_FORMATTING') {
                step = 'CF'
            } else {
                step = 'QC'
            }
        }
        setStep(step)
        const transcriptRes = await axiosInstance.get(
            `${FILE_CACHE_URL}/fetch-transcript?fileId=${orderRes.orderDetails.fileId}&step=${step}&orderId=${orderRes.orderDetails.orderId}` //step will be used later when cf editor is implemented
        )

        const transcript = JSON.parse(localStorage.getItem('transcript') || '{}')[
            orderRes.orderDetails.fileId
        ]
        if (transcript) {
            setTranscript(transcript)
        } else {
            setTranscript(transcriptRes.data.result.transcript)
        }
        setCtms(transcriptRes.data.result.ctms)

        // const playerEventRes = await axios.get(`/api/editor/player-events?orderId=${orderRes.data.orderId}`);

        setPlayerEvents([]) // TODO: Implement player events
        return orderRes.orderDetails
    } catch (error) {
        console.log(error)
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
            return
        }
        toast.error('Failed to fetch file details')
    }
}

interface PlayerEvent {
    t: number
    s: number
}

type HandleSaveParams = {
    getEditorText: () => string
    orderDetails: OrderDetails
    notes: string
    cfd: string
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>
    playerEvents: PlayerEvent[]
}

const handleSave = async (
    {
        getEditorText,
        orderDetails,
        notes,
        cfd,
        setButtonLoading,
        playerEvents,
    }: HandleSaveParams,
    showToast = true
) => {
    setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        save: true,
    }))

    const toastId = showToast ? toast.loading(`Saving Transcription...`) : null

    try {
        const transcript = getEditorText()
        if (!transcript) return toast.error('Transcript is empty')
        const paragraphs = transcript
            .split('\n')
            .filter((paragraph) => paragraph.trim() !== '')
        const paragraphRegex = /^\d{1,2}:\d{2}:\d{2}\.\d\sS\d+:/
        for (const paragraph of paragraphs) {
            if (
                !paragraphRegex.test(paragraph) &&
                orderDetails.orderType !== 'TRANSCRIPTION_FORMATTING'
            ) {
                if (showToast) {
                    if (toastId) toast.dismiss(toastId)
                    toast.error(
                        'Invalid paragraph format detected. Each paragraph must start with a timestamp and speaker identification.'
                    )
                }
                return
            }
        }

        //TODO: Implement this
        // Get last saved index from localStorage
        // const lastSavedIndex = parseInt(localStorage.getItem(`${orderDetails.fileId}_lastEventIndex`) || '-1');

        // Get only new events since last save
        // const newEvents = playerEvents.slice(lastSavedIndex + 1);

        // Save current last index
        // localStorage.setItem(`${orderDetails.fileId}_lastEventIndex`, (playerEvents.length - 1).toString());

        // Save notes and other data

        await axiosInstance.post(`${FILE_CACHE_URL}/save-transcript`, {
            fileId: orderDetails.fileId,
            transcript,
            cfd: cfd, //!this will be used when the cf side of the editor is begin worked on.
            orderId: orderDetails.orderId,
            // playerEvents: newEvents // Send only new events
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

const capitalizeWord = (quillRef: React.RefObject<ReactQuill> | undefined) => {
    if (quillRef?.current) {
        const quill = quillRef.current.getEditor();
        const text = quill.getText();

        // Find all matches using regex
        const regex = /\.\s+([a-z])/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const index = match.index + 2; // +2 to account for the period and space
            const length = 1; // length of the character to capitalize

            // Get the character to capitalize
            const char = match[1].toUpperCase();

            // Use Quill's deleteText and insertText methods
            quill.deleteText(index, length);
            quill.insertText(index, char);
        }
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
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>
    getPlayedPercentage: () => number
    router: {
        push: (path: string) => void
    }
    quill: Quill
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

const handleSubmit = async ({
    orderDetails,
    step,
    editorMode,
    fileToUpload,
    setButtonLoading,
    getPlayedPercentage,
    router,
    quill,
}: HandleSubmitParams) => {
    if (!orderDetails || !orderDetails.orderId || !step) return
    const toastId = toast.loading(`Submitting Transcription...`)
    const transcript = quill.getText() || ''

    try {
        if (orderDetails.status === 'QC_ASSIGNED') {
            checkTranscriptForAllowedMeta(quill)
        }
        setButtonLoading((prevButtonLoading) => ({
            ...prevButtonLoading,
            submit: true,
        }))
        const playedPercentage = getPlayedPercentage()
        if (playedPercentage < MINIMUM_AUDIO_PLAYBACK_PERCENTAGE) {
            throw new Error(`MAPPNM`) //Stands for "Minimum Audio Playback Percentage Not Met"
        }

        if (step === 'CF') {
            if (!fileToUpload.isUploaded) throw new Error('UF')
            await submitReviewAction(
                Number(orderDetails.orderId),
                orderDetails.fileId,
                transcript
            )
        } else {
            await submitQCAction({
                fileId: orderDetails.fileId,
                orderId: Number(orderDetails.orderId),
                transcript,
            })
        }

        localStorage.removeItem('transcript')
        localStorage.removeItem(orderDetails.fileId)
        toast.dismiss(toastId)
        const successToastId = toast.success(`Transcription submitted successfully`)
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
            case 'IMT':
                errorText = `Invalid meta found in transcript. Please remove the meta from the transcript.`
            // Add more cases as needed
        }
        const errorToastId = toast.error(errorText)
        toast.dismiss(errorToastId)
    } finally {
        setButtonLoading((prevButtonLoading) => ({
            ...prevButtonLoading,
            submit: false,
        }))
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
        const response = await getFrequentTermsAction()
        if (response.success) {
            const data = {
                edited: response.edited ?? '',
                autoGenerated: response.autoGenerated ?? '',
            }
            setFrequentTermsData(data)
            setFrequentTermsModalOpen(true)
        } else {
            throw new Error('No frequent terms data found')
        }
    } catch (error) {
        const errorMessage = axios.isAxiosError(error)
            ? error.response?.data.error
                ? error.response.data.error
                : 'Failed to get frequent terms'
            : 'An unexpected error occurred'

        toast.error(errorMessage)
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
                const newHours = Math.floor(adjustedTimestamp / 3600)
                const newMinutes = Math.floor((adjustedTimestamp % 3600) / 60)
                const newSeconds = (adjustedTimestamp % 60).toFixed(1)
                const newTimestamp = `${newHours}:${newMinutes
                    .toString()
                    .padStart(2, '0')}:${newSeconds.padStart(4, '0')}`
                return paragraph.replace(/^\d{1,2}:\d{2}:\d{2}\.\d/, newTimestamp)
            }
            return paragraph
        })
        .join('\n\n')

    quill.deleteText(selection.index, selection.length)
    quill.insertText(selection.index, adjustedText)

    toast.success('Timestamps adjusted successfully.')
}

const playCurrentParagraphTimestamp = (
    quill: Quill,
    audioPlayer: HTMLAudioElement | null,
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

export interface CustomerQuillSelection {
    index: number;
    length: number;
}

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
        end: quill.getText().length
    }

    // If there's a selection, limit search to that range
    if (selection && selection.length > 0 && matchSelection) {
        searchRange.start = selection.index
        searchRange.end = selection.index + selection.length

        // Clear the previous highlight if it exists and is valid
        if (lastSearchIndex >= 0 && lastSearchIndex < quill.getText().length) {
            quill.formatText(selection.index, selection.length, {
                background: '#D9D9D9'
            })
        }
    }

    const text = quill.getText(searchRange.start, searchRange.end - searchRange.start)
    const effectiveSearchText = matchCase ? searchText : searchText.toLowerCase()

    let startIndex = searchBackwards
        ? lastSearchIndex - 1 - searchRange.start
        : lastSearchIndex + 1 - searchRange.start

    if (startIndex < 0 || startIndex >= text.length) {
        startIndex = searchBackwards ? text.length - 1 : 0
    }

    let index = -1
    if (searchBackwards) {
        index = matchCase
            ? text.lastIndexOf(searchText, startIndex)
            : text.toLowerCase().lastIndexOf(effectiveSearchText, startIndex)

        // If not found searching backwards, wrap to end
        if (index === -1 && startIndex !== text.length - 1) {
            index = matchCase
                ? text.lastIndexOf(searchText, text.length - 1)
                : text.toLowerCase().lastIndexOf(effectiveSearchText, text.length - 1)
        }
    } else {
        index = matchCase
            ? text.indexOf(searchText, startIndex)
            : text.toLowerCase().indexOf(effectiveSearchText, startIndex)

        // If not found searching forwards, wrap to start
        if (index === -1 && startIndex !== 0) {
            index = matchCase
                ? text.indexOf(searchText, 0)
                : text.toLowerCase().indexOf(effectiveSearchText, 0)
        }
    }

    if (index !== -1) {
        // Adjust index relative to document start
        const absoluteIndex = index + searchRange.start

        // Apply new highlight
        quill.formatText(absoluteIndex, searchText.length, {
            'background': '#b3d4fc'
        })

        // Store the current search highlight
        setSearchHighlight({ index: absoluteIndex, length: searchText.length })

        // Scroll the highlighted text into view
        const bounds = quill.getBounds(absoluteIndex)
        const editorElement = quill.root
        const scrollingContainer = editorElement.closest('.ql-editor')
        if (scrollingContainer && bounds) {
            const containerRect = scrollingContainer.getBoundingClientRect()
            const scrollTop = bounds.top + scrollingContainer.scrollTop - containerRect.height / 2
            scrollingContainer.scrollTop = scrollTop
        }

        setLastSearchIndex(absoluteIndex)
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
    if (!quill) return

    let replaced = false
    const searchRange = {
        start: 0,
        end: quill.getText().length
    }

    // If there's a selection, limit replacements to that range
    if (selection && selection.length > 0 && matchSelection) {
        searchRange.start = selection.index
        searchRange.end = selection.index + selection.length
    }

    const text = quill.getText(searchRange.start, searchRange.end - searchRange.start)
    const effectiveSearchText = matchCase ? searchText : searchText.toLowerCase()
    const textToSearch = matchCase ? text : text.toLowerCase()

    const replace = (index: number) => {
        const absoluteIndex = index + searchRange.start
        quill.deleteText(absoluteIndex, searchText.length)
        quill.insertText(absoluteIndex, replaceWith)
        replaced = true
    }

    if (replaceAll) {
        let startIndex = 0
        let index = textToSearch.indexOf(effectiveSearchText, startIndex)

        while (index !== -1) {
            replace(index)
            startIndex = index + replaceWith.length

            // Update text after replacement
            const updatedText = quill.getText(searchRange.start, searchRange.end - searchRange.start)
            const updatedTextToSearch = matchCase ? updatedText : updatedText.toLowerCase()
            index = updatedTextToSearch.indexOf(effectiveSearchText, startIndex)
        }
    } else {
        const currentSelection = quill.getSelection()
        if (currentSelection && currentSelection.length > 0) {
            const selectedText = quill.getText(
                currentSelection.index,
                currentSelection.length
            )
            if (
                (matchCase && selectedText === searchText) ||
                (!matchCase && selectedText.toLowerCase() === effectiveSearchText)
            ) {
                replace(currentSelection.index - searchRange.start)
            }
        } else {
            const index = textToSearch.indexOf(effectiveSearchText)
            if (index !== -1) {
                replace(index)
            }
        }
    }

    if (!replaced) {
        toastInstance.error('Text not found in selected range')
    }
}

const insertTimestampAndSpeakerInitialAtStartOfCurrentLine = (
    audioPlayer: HTMLAudioElement | null,
    quill: Quill | undefined
) => {
    if (!audioPlayer || !quill) return;

    const currentTime = audioPlayer.currentTime;
    const formattedTime = convertSecondsToTimestamp(currentTime);
    const currentSelection = quill.getSelection();

    let paragraphStart = currentSelection ? currentSelection.index : 0;
    while (paragraphStart > 0 && quill.getText(paragraphStart - 1, 1) !== '\n') {
        paragraphStart--;
    }

    // Check for existing timestamp and speaker pattern at start of line
    const lineText = quill.getText(paragraphStart, 14); // Get enough text to check pattern
    const timestampSpeakerPattern = /^\d{1}:\d{2}:\d{2}\.\d{1} S\d+: /;

    if (timestampSpeakerPattern.test(lineText)) {
        // If pattern exists, delete it before inserting new one
        const match = lineText.match(timestampSpeakerPattern);
        if (match) {
            quill.deleteText(paragraphStart, match[0].length);
        }
    }

    const speakerText = ' S1: ';
    quill.insertText(paragraphStart, formattedTime + speakerText);

    // Select just the speaker number for easy editing
    const speakerNumberStart = paragraphStart + formattedTime.length + 2; // +2 for ' S'
    quill.setSelection(speakerNumberStart, 1); // Select just the '1' in 'S1'
};

const insertTimestampBlankAtCursorPosition = (
    audioPlayer: HTMLAudioElement | null,
    quill: Quill | undefined
) => {
    if (!audioPlayer || !quill) return

    const cursorPosition = quill.getSelection()?.index || 0

    // Check if cursor is at start of paragraph
    let isStartOfParagraph = true;
    if (cursorPosition > 0) {
        const textBeforeCursor = quill.getText(cursorPosition - 1, 1);
        if (textBeforeCursor !== '\n') {
            isStartOfParagraph = false;
        }
    }

    if (isStartOfParagraph) {
        // Call the other function instead
        insertTimestampAndSpeakerInitialAtStartOfCurrentLine(audioPlayer, quill);
        return;
    }

    const currentTime = audioPlayer.currentTime

    const hours = Math.floor(currentTime / 3600)
    const minutes = Math.floor((currentTime % 3600) / 60)
    const seconds = Math.floor(currentTime % 60)
    const milliseconds = Math.floor((currentTime % 1) * 10)

    const formattedTime = ` [${hours}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}.${milliseconds}] ____`

    quill.insertText(cursorPosition, formattedTime, { color: '#FF0000' })
    quill.setSelection(cursorPosition + formattedTime.length, 0)
}

export {
    generateRandomColor,
    convertBlankToSeconds,
    convertTimestampToSeconds,
    updatePlayedPercentage,
    convertSecondsToTimestamp,
    downloadMP3,
    handleTextFilesUpload,
    uploadTextFile,
    uploadFile,
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
    insertTimestampAndSpeakerInitialAtStartOfCurrentLine,
    capitalizeWord
}
export type { CTMType }
