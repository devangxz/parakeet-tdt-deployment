import axios from 'axios';
import { Session } from "next-auth";
import Quill from 'quill';
import { toast } from "sonner"

import axiosInstance from "./axios"
import { OrderDetails, UploadFilesType } from "@/app/editor/dev/[orderId]/page"
import { CTMSWord } from "@/components/editor/transcriptUtils";
import { ALLOWED_META, BACKEND_URL, MINIMUM_AUDIO_PLAYBACK_PERCENTAGE } from "@/constants"
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
    "#FF4136", // Red
    "#2ECC40", // Green
    "#0074D9", // Blue
    "#FFDC00", // Yellow
    "#B10DC9", // Magenta
    "#39CCCC", // Cyan
    "#FF851B", // Orange
    "#F012BE", // Purple
    "#3D9970", // Teal
    "#FF69B4", // Pink
    "#01FF70", // Lime Green
    "#85144b", // Dark Red
    "#3F729B", // Dark Blue
    "#FFD700", // Gold
    "#9400D3", // Dark Violet
    "#3CB371", // Medium Sea Green
    "#FF1493", // Deep Pink
    "#FF6347", // Tomato
    "#20B2AA", // Light Sea Green
    "#7B68EE", // Medium Slate Blue
];

function generateRandomColor() {
    const color = usableColors[0]
    usableColors.splice(0, 1)
    return color
}

function convertBlankToSeconds(timeString: string) {
    const pattern = /\[(\d{1,2}):(\d{2}):(\d{2})\.(\d)\]/;
    const matches = timeString.match(pattern);

    if (!matches) {
        return null; // Invalid time format
    }

    const hours = parseInt(matches[1]);
    const minutes = parseInt(matches[2]);
    const seconds = parseInt(matches[3]);
    const tenths = parseInt(matches[4]);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds + tenths * 0.1;
    return totalSeconds;
}

function convertTimestampToSeconds(timestamp: string) {
    const [hours, minutes, seconds] = timestamp.split(':').map(parseFloat);
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    return totalSeconds;
}

type ConvertedASROutput = {
    start: number;
    duration: number;
    end: number;
    word: string;
    conf: number;
    chars: string;
    punct: string;
    source: string;
    turn_prob: number;
    index: number;
    speaker: string;
    turn?: number;
};

const updatePlayedPercentage = (audioPlayer: HTMLAudioElement | null, audioPlayed: Set<number>, setPlayedPercentage: React.Dispatch<React.SetStateAction<number>>) => {
    if (!audioPlayer) return
    const duration = audioPlayer.duration
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

const downloadBlankDocx = async ({ orderDetails, downloadableType, setButtonLoading }: { orderDetails: OrderDetails, downloadableType: string, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>> }) => {
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

const convertSecondsToTimestamp = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secondsLeft = seconds % 60

    return `${hours}:${minutes.toString().padStart(2, '0')}:${secondsLeft
        .toFixed(1)
        .padStart(4, '0')}`
}

const downloadEditorDocxFile = async (orderDetails: OrderDetails, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>) => {
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

const downloadEditorTextFile = async (orderDetails: OrderDetails, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>) => {
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

const downloadMP3 = async (orderDetails: OrderDetails, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>) => {
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

const handleTextFilesUpload = async (payload: UploadFilesType, orderDetails: OrderDetails, setFileToUpload: React.Dispatch<React.SetStateAction<{ renamedFile: File | null, originalFile: File | null, isUploaded?: boolean }>>) => {
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

const uploadTextFile = async (fileToUpload: { renamedFile: File | null }, orderDetails: OrderDetails, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>, session: Session | null, setFileToUpload: React.Dispatch<React.SetStateAction<{ renamedFile: File | null, originalFile: File | null, isUploaded?: boolean }>>) => {
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

const uploadFile = async (fileToUpload: { renamedFile: File | null }, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>, session: Session | null, setFileToUpload: React.Dispatch<React.SetStateAction<{ renamedFile: File | null, originalFile: File | null, isUploaded?: boolean }>>) => {
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

const handleFilesUpload = async (payload: UploadFilesType, orderDetailsId: string, setFileToUpload: React.Dispatch<React.SetStateAction<{ renamedFile: File | null, originalFile: File | null, isUploaded?: boolean }>>) => {
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
        const renamedFile = new File([file], `${orderDetailsId}_cf.docx`, {
            type: file.type,
        })
        setFileToUpload({ renamedFile, originalFile: file })
    } catch (error) {
        throw error
    }
}

const reportHandler = async (reportDetails: { reportComment: string; reportOption: string }, orderId: string, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>, setReportModalOpen: React.Dispatch<React.SetStateAction<boolean>>, setReportDetails: React.Dispatch<React.SetStateAction<{ reportComment: string; reportOption: string }>>) => {
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
            orderId: orderId,
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

const fetchPdfFile = async (fileId: string, setPdfUrl: React.Dispatch<React.SetStateAction<string>>) => {
    try {
        const response = await fetch(
            `${BACKEND_URL}/get-pdf-document/${fileId}`
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

const regenDocx = async (fileId: string, orderId: string, setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>, setRegenCount: React.Dispatch<React.SetStateAction<number>>, setPdfUrl: React.Dispatch<React.SetStateAction<string>>) => {
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
    params: Record<string, string | string[]> | null;
    setOrderDetails: React.Dispatch<React.SetStateAction<OrderDetails>>;
    setCfd: React.Dispatch<React.SetStateAction<string>>;
    setStep: React.Dispatch<React.SetStateAction<string>>;
    setDownloadableType: React.Dispatch<React.SetStateAction<string>>;
    setTranscript: React.Dispatch<React.SetStateAction<string>>;
    setCtms: React.Dispatch<React.SetStateAction<ConvertedASROutput[]>>;
};

const fetchFileDetails = async ({
    params,
    setOrderDetails,
    setCfd,
    setStep,
    setDownloadableType,
    setTranscript,
    setCtms,
}: FetchFileDetailsParams) => {
    try {
        const orderRes = await axiosInstance.get(
            `${BACKEND_URL}/order-details?orderId=${params?.orderId}`
        )
        setOrderDetails(orderRes.data)
        setCfd(orderRes.data.cfd)
        const cfStatus = ['FORMATTED', 'REVIEWER_ASSIGNED', 'REVIEW_COMPLETED']
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

type HandleSaveParams = {
    getEditorText: () => string;
    orderDetails: OrderDetails;
    notes: string;
    step: string;
    cfd: string;
    updatedCtms: CTMSWord[];
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>;
};

const handleSave = async ({
    getEditorText,
    orderDetails,
    notes,
    step,
    cfd,
    updatedCtms,
    setButtonLoading,
}: HandleSaveParams) => {
    setButtonLoading((prevButtonLoading) => ({
        ...prevButtonLoading,
        save: true,
    }));
    const transcript = getEditorText();
    const paragraphs = transcript.split('\n').filter(paragraph => paragraph.trim() !== '');
    const paragraphRegex = /^\d{1,2}:\d{2}:\d{2}\.\d\sS\d+:/;
    for (const paragraph of paragraphs) {
        if (!paragraphRegex.test(paragraph)) {
            return toast.error('Invalid paragraph format detected. Each paragraph must start with a timestamp and speaker identification.');
        }
    }
    localStorage.setItem(orderDetails.fileId, JSON.stringify({ notes: notes }));
    const toastId = toast.loading(`Saving Transcription...`);
    try {
        await axiosInstance.post(`${BACKEND_URL}/save-transcript`, {
            fileId: orderDetails.fileId,
            transcript,
            step,
            cfd: cfd,
            ctms: updatedCtms,
            orderId: orderDetails.orderId,
        });
        toast.dismiss(toastId);
        const successToastId = toast.success(`Transcription saved successfully`);
        toast.dismiss(successToastId);
    } catch (error) {
        toast.dismiss(toastId);
        const errorToastId = toast.error(`Error while saving transcript`);
        toast.dismiss(errorToastId);
    } finally {
        setButtonLoading((prevButtonLoading) => ({
            ...prevButtonLoading,
            save: false,
        }));
    }
};

type HandleSubmitParams = {
    orderDetails: OrderDetails;
    step: string;
    editorMode: string;
    fileToUpload: {
        renamedFile: File | null;
        originalFile: File | null;
        isUploaded?: boolean;
    };
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>;
    getPlayedPercentage: () => number;
    router: {
        push: (path: string) => void;
    };
    quill: Quill;
};

const checkTranscriptForAllowedMeta = (quill: Quill) => {
    if (!quill) return null;

    const text = quill.getText();
    const regex = /\[([^\]]+)\](?!\s+____)/g;
    let match;
    let error = null;

    while ((match = regex.exec(text)) !== null) {
        const content = match[1];
        if (!ALLOWED_META.includes(content.toLowerCase())) {
            const index = match.index;
            const length = match[0].length;

            quill.setSelection(index, length);
            quill.scrollIntoView();

            error = { message: 'IMT' };

            break;
        }
    }

    throw new Error(error?.message);
};

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
    if (!orderDetails || !orderDetails.orderId || !step) return;
    const toastId = toast.loading(`Submitting Transcription...`);
    checkTranscriptForAllowedMeta(quill);
    try {
        setButtonLoading((prevButtonLoading) => ({
            ...prevButtonLoading,
            submit: true,
        }));
        const playedPercentage = getPlayedPercentage();
        if (playedPercentage < MINIMUM_AUDIO_PLAYBACK_PERCENTAGE) {
            throw new Error(`MAPPNM`); //Stands for "Minimum Audio Playback Percentage Not Met"
        }

        if (step === 'CF') {
            await axiosInstance.post(
                `${BACKEND_URL}/submit-review`,
                {
                    fileId: orderDetails.fileId,
                    orderId: orderDetails.orderId,
                    mode: editorMode.toLowerCase(),
                }
            );
        } else {
            if (!fileToUpload.isUploaded || !fileToUpload.renamedFile)
                throw new Error('UF');

            const formData = new FormData();
            formData.append('file', fileToUpload.renamedFile);

            const queryString = `fileId=${orderDetails.fileId}&orderId=${orderDetails.orderId}&mode=${editorMode.toLowerCase()}`;

            await axiosInstance.post(
                `${BACKEND_URL}/submit-qc?${queryString}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
        }

        toast.dismiss(toastId);
        const successToastId = toast.success(
            `Transcription submitted successfully`
        );
        toast.dismiss(successToastId);
        router.push(`/transcribe/${step === 'QC' ? 'qc' : 'legal-cf-reviewer'}`);
    } catch (error) {
        setTimeout(() => {
            toast.dismiss(toastId);
        }, 100); //Had to use this setTimeout because the minimum percentage check gives an error Immediately

        let errorText = 'Error while submitting transcript'; // Default error message
        switch ((error as Error).message) {
            case 'MAPPNM':
                errorText = `Please make sure you have at least ${MINIMUM_AUDIO_PLAYBACK_PERCENTAGE}% of the audio played.`;
                break;
            case 'UF':
                errorText = `Please upload a file before submitting`;
                break;
            case 'IMT':
                errorText = `Invalid meta found in transcript. Please remove the meta from the transcript.`;
            // Add more cases as needed
        }
        const errorToastId = toast.error(errorText);
        toast.dismiss(errorToastId);
    } finally {
        setButtonLoading((prevButtonLoading) => ({
            ...prevButtonLoading,
            submit: false,
        }));
    }
};

const getFrequentTermsHandler = async (
    userId: string,
    setButtonLoading: React.Dispatch<React.SetStateAction<ButtonLoading>>,
    setFrequentTermsData: React.Dispatch<React.SetStateAction<{ autoGenerated: string; edited: string }>>,
    setFrequentTermsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
    setButtonLoading(prev => ({ ...prev, frequentTerms: true }));

    try {
        const { data } = await axiosInstance.get(`${BACKEND_URL}/frequent-terms/${userId}`);
        if (data) {
            setFrequentTermsData(data);
            setFrequentTermsModalOpen(true);
        } else {
            throw new Error('No frequent terms data found');
        }
    } catch (error) {
        const errorMessage = axios.isAxiosError(error)
            ? error.response?.data.error
                ? error.response.data.error
                : 'Failed to get frequent terms'
            : 'An unexpected error occurred';

        toast.error(errorMessage);
    } finally {
        setButtonLoading(prev => ({ ...prev, frequentTerms: false }));
    }
};

const extractTimestamp = (text: string): number | null => {
    const match = text.match(/(\d{1,2}):(\d{2}):(\d{2}\.\d)/);
    if (match) {
        const [, hours, minutes, seconds] = match;
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    }
    return null;
};

const playAudioAtTimestamp = (audioPlayer: HTMLAudioElement, timestamp: number) => {
    audioPlayer.currentTime = timestamp;
    audioPlayer.play();
};

const findParagraphStart = (quill: Quill, index: number): number => {
    let start = index;
    while (start > 0 && quill.getText(start - 1, 1) !== '\n') {
        start--;
    }
    return start;
};

const navigateAndPlayBlanks = (
    quill: Quill,
    audioPlayer: HTMLAudioElement | null,
    setDisableGoToWord: (disable: boolean) => void,
    goToPrevious = false
) => {
    setDisableGoToWord(true);
    if (!quill || !audioPlayer) return;

    const text: string = quill.getText();
    const regex = /\[\d{1,2}:\d{2}:\d{2}\.\d\] ____/g;
    const matches = Array.from(text.matchAll(regex));

    if (matches.length === 0) return;

    let currentIndex = 0;
    const selection = quill.getSelection();
    if (selection) {
        currentIndex = matches.findIndex((match, index) => {
            const nextMatch = matches[index + 1] || null;
            return nextMatch ? selection.index >= match.index && selection.index < nextMatch.index : selection.index >= match.index;
        });
    }

    currentIndex = goToPrevious
        ? (currentIndex > 0 ? currentIndex - 1 : matches.length - 1)
        : (currentIndex >= 0 && currentIndex < matches.length - 1 ? currentIndex + 1 : 0);

    const match = matches[currentIndex];
    if (!match) return;

    quill.setSelection(match.index, match[0].length, 'silent');
    quill.scrollIntoView();

    const timestamp = extractTimestamp(match[0]);
    if (timestamp !== null) {
        playAudioAtTimestamp(audioPlayer, timestamp);
    }

    setTimeout(() => setDisableGoToWord(false), 100);
};

const adjustTimestamps = (
    quill: Quill,
    newCtms: CTMSWord[],
    setNewCtms: (ctms: CTMSWord[]) => void,
    adjustment: number,
    selection: { index: number; length: number } | null
) => {
    if (!quill) return;

    console.log(selection)
    if (!selection) {
        toast.error("Please select text to adjust timestamps.");
        return;
    }

    const selectedText = quill.getText(selection.index, selection.length);
    if (!selectedText.trim()) {
        toast.error("Please select text to adjust timestamps.");
        return;
    }

    const paragraphs = selectedText.split('\n\n');

    const adjustedText = paragraphs.map(paragraph => {
        const timestamp = extractTimestamp(paragraph);
        if (timestamp !== null) {
            const adjustedTimestamp = timestamp + adjustment;
            const newHours = Math.floor(adjustedTimestamp / 3600);
            const newMinutes = Math.floor((adjustedTimestamp % 3600) / 60);
            const newSeconds = (adjustedTimestamp % 60).toFixed(1);
            const newTimestamp = `${newHours}:${newMinutes.toString().padStart(2, '0')}:${newSeconds.padStart(4, '0')}`;
            return paragraph.replace(/^\d{1,2}:\d{2}:\d{2}\.\d/, newTimestamp);
        }
        return paragraph;
    }).join('\n\n');

    quill.deleteText(selection.index, selection.length);
    quill.insertText(selection.index, adjustedText);

    const updatedCtms = newCtms.map(ctm => {
        if (ctm.start >= selection.index && ctm.start < selection.index + selection.length) {
            return { ...ctm, start: ctm.start + adjustment, end: ctm.end + adjustment };
        }
        return ctm;
    });
    setNewCtms(updatedCtms);

    toast.success("Timestamps adjusted successfully.");
};

const playCurrentParagraphTimestamp = (
    quill: Quill,
    audioPlayer: HTMLAudioElement | null,
    setDisableGoToWord: (disable: boolean) => void
) => {
    setDisableGoToWord(true);
    if (!quill || !audioPlayer) return;

    const selection = quill.getSelection();
    if (!selection) {
        toast.error("Please place the cursor in a paragraph.");
        return;
    }

    const paragraphStart = findParagraphStart(quill, selection.index);
    const paragraphText = quill.getText(paragraphStart, 50);
    const timestamp = extractTimestamp(paragraphText);

    if (timestamp !== null) {
        playAudioAtTimestamp(audioPlayer, timestamp);
    } else {
        toast.error("No timestamp found at the start of this paragraph.");
    }

    setTimeout(() => setDisableGoToWord(false), 100);
};

const searchAndSelect = (quill: Quill, searchText: string, matchCase: boolean, lastSearchIndex: number, setLastSearchIndex: (index: number) => void, toastInstance: { error: (msg: string) => void }) => {
    if (!quill) return;

    const text = quill.getText();
    const currentSelection = quill.getSelection();
    let startIndex = 0;

    const effectiveSearchText = matchCase ? searchText : searchText.toLowerCase();

    // Check if the current selection matches the search text and adjust the start index accordingly
    if (currentSelection) {
        const selectionText = text.substr(currentSelection.index, currentSelection.length);
        if ((matchCase && selectionText === searchText) || (!matchCase && selectionText.toLowerCase() === effectiveSearchText)) {
            startIndex = currentSelection.index + searchText.length;
        } else {
            startIndex = lastSearchIndex + 1;
        }
    }

    let index = matchCase ? text.indexOf(searchText, startIndex) : text.toLowerCase().indexOf(effectiveSearchText, startIndex);

    // If not found from the current position, start from the beginning
    if (index === -1 && startIndex !== 0) {
        startIndex = 0;
        index = matchCase ? text.indexOf(searchText, startIndex) : text.toLowerCase().indexOf(effectiveSearchText, startIndex);
    }

    if (index !== -1) {
        // Select the found text
        quill.setSelection(index, searchText.length);
        setLastSearchIndex(index);
    } else {
        // If text is not found, reset the search
        setLastSearchIndex(-1);
        toastInstance.error('Text not found');
    }
};

const replaceTextHandler = (quill: Quill, searchText: string, replaceWith: string, replaceAll: boolean, matchCase: boolean, toastInstance: { error: (msg: string) => void }) => {
    if (!quill) return;

    let replaced = false;
    const text = quill.getText();
    const effectiveSearchText = matchCase ? searchText : searchText.toLowerCase();
    const textToSearch = matchCase ? text : text.toLowerCase();

    const replace = (index: number) => {
        quill.deleteText(index, searchText.length);
        quill.insertText(index, replaceWith);
        replaced = true;
    };

    if (replaceAll) {
        let startIndex = 0;
        let index = textToSearch.indexOf(effectiveSearchText, startIndex);
        while (index !== -1) {
            replace(index);
            startIndex = index + replaceWith.length;
            // Update textToSearch to reflect changes made by replacement
            const updatedText = quill.getText();
            const updatedTextToSearch = matchCase ? updatedText : updatedText.toLowerCase();
            index = updatedTextToSearch.indexOf(effectiveSearchText, startIndex);
        }
    } else {
        const currentSelection = quill.getSelection();
        if (currentSelection && currentSelection.length > 0) {
            const selectedText = quill.getText(currentSelection.index, currentSelection.length);
            if ((matchCase && selectedText === searchText) || (!matchCase && selectedText.toLowerCase() === effectiveSearchText)) {
                replace(currentSelection.index);
            }
        } else {
            const index = textToSearch.indexOf(effectiveSearchText);
            if (index !== -1) {
                replace(index);
            }
        }
    }

    if (!replaced) {
        toastInstance.error('Text not found');
    }
};

export {
    generateRandomColor,
    convertBlankToSeconds,
    convertTimestampToSeconds,
    updatePlayedPercentage,
    downloadBlankDocx,
    convertSecondsToTimestamp,
    downloadEditorDocxFile,
    downloadEditorTextFile,
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
    replaceTextHandler
};
export type { ConvertedASROutput };
