'use client';

import axios from 'axios';
import { Download, FileUp, Loader2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useUpload } from '@/app/context/UploadProvider';
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES, UPLOAD_RETRY_DELAY } from '@/constants';
import { cn } from '@/lib/utils';
import sleep from '@/utils/sleep';

interface UploadState {
    uploadId: string | null;
    key: string | null;
    completedParts: { ETag?: string; PartNumber: number }[];
    totalUploaded: number;
    lastFailedPart: number | null;
}

interface StreamingState extends UploadState {
    buffer: Uint8Array[];
    bufferSize: number;
    partNumber: number;
    abortController: AbortController;
    downloadedBytes: number;
    totalSize: number;
}

interface QueuedLink {
    url: string;
    fileName: string;
    fileId: string;
    size: number;
    type: string;
}

interface LinkImporterProps {
    onUploadSuccess: (success: boolean) => void;
}

const LinkImporter: React.FC<LinkImporterProps> = ({ onUploadSuccess }) => {
    const { uploadingFiles, setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
    const [urls, setUrls] = useState('');

    const uploadStatesRef = useRef<Record<string, StreamingState>>({});

    const calculateOverallProgress = (
        downloadProgress: number,
        uploadProgress: number,
        downloadWeight: number = 0.3,
        uploadWeight: number = 0.7
    ): number => (downloadProgress * downloadWeight + uploadProgress * uploadWeight);

    const extractFileName = (url: string): string => {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/');
            const fileName = pathSegments[pathSegments.length - 1];
            return decodeURIComponent(fileName || 'imported-file');
        } catch {
            return 'imported-file';
        }
    };

    const isRetryableError = (error: unknown): boolean => {
        if (!axios.isAxiosError(error)) return false;

        const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
        return !error.response?.status || retryableStatusCodes.includes(error.response.status);
    };

    const handleRetryableError = async (error: unknown, retryCount: number): Promise<void> => {
        if (axios.isCancel(error)) {
            throw new Error('Upload cancelled');
        }

        if (!isRetryableError(error)) {
            throw error;
        }

        if (retryCount >= UPLOAD_MAX_RETRIES) {
            throw new Error(`File upload failed after ${UPLOAD_MAX_RETRIES} attempts`);
        }

        const delay = UPLOAD_RETRY_DELAY * Math.pow(2, retryCount);
        await sleep(delay);
    };

    const cleanupUpload = async (fileName: string, uploadState?: StreamingState) => {
        if (uploadState?.uploadId && uploadState?.key) {
            try {
                await axios.post('/api/s3-upload/multi-part/abort', {
                    uploadId: uploadState.uploadId,
                    key: uploadState.key
                });
            } catch (error) {
                toast.error(`Failed to abort multipart upload for file ${fileName}`);
            }
        }

        if (uploadState?.abortController) {
            uploadState.abortController.abort();
        }

        delete uploadStatesRef.current[fileName];
    };

    const singlePartUpload = async (
        url: string,
        fileName: string,
        fileId: string,
        totalSize: number,
        contentType: string
    ): Promise<void> => {
        const abortController = new AbortController();
        let retryCount = -1;
        let downloadedBytes = 0;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const downloadResponse = await fetch('/api/s3-upload/link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                    signal: abortController.signal
                });

                if (!downloadResponse.ok || !downloadResponse.body) {
                    throw new Error('Download failed');
                }

                const reader = downloadResponse.body.getReader();
                const chunks: Uint8Array[] = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    downloadedBytes += value.length;
                    const downloadProgress = (downloadedBytes / totalSize) * 100;

                    updateUploadStatus(fileName, {
                        progress: Math.min(calculateOverallProgress(downloadProgress, 0), 99),
                        status: 'uploading'
                    });
                }

                const blob = new Blob(chunks, { type: contentType });
                const formData = new FormData();
                formData.append('file', blob, fileName);
                formData.append('fileId', fileId);

                await axios.post('/api/s3-upload/single-part', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    signal: abortController.signal,
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const uploadProgress = (progressEvent.loaded / progressEvent.total) * 100;
                            updateUploadStatus(fileName, {
                                progress: Math.min(calculateOverallProgress(100, uploadProgress), 99),
                                status: 'uploading'
                            });
                        }
                    },
                });
                return;
            } catch (error) {
                retryCount++;
                await handleRetryableError(error, retryCount);
            }
        }
    };

    const multiPartUpload = async (
        url: string,
        fileName: string,
        fileId: string,
        contentLength: number,
        contentType: string,
    ): Promise<void> => {
        let state = await initializeMultiPartUpload(fileName, fileId, contentType, contentLength);
        uploadStatesRef.current[fileName] = state;

        try {
            const response = await fetch('/api/s3-upload/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
                signal: state.abortController.signal
            });

            if (!response.ok || !response.body) {
                throw new Error('Download failed');
            }

            const reader = response.body.getReader();

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    if (state.bufferSize > 0) {
                        state = await uploadBufferedPart(state, fileName);
                    }
                    break;
                }

                state.buffer.push(value);
                state.bufferSize += value.length;
                state.downloadedBytes += value.length;

                updateUploadStatus(fileName, {
                    progress: Math.min(calculateOverallProgress(
                        (state.downloadedBytes / state.totalSize) * 100,
                        (state.totalUploaded / state.totalSize) * 100
                    ), 99),
                    status: 'uploading'
                });

                if (state.bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
                    state = await uploadBufferedPart(state, fileName);
                }
            }

            let retryCount = -1;
            const sortedParts = state.completedParts.sort((a, b) => a.PartNumber - b.PartNumber);

            while (retryCount <= UPLOAD_MAX_RETRIES) {
                try {
                    await axios.post('/api/s3-upload/multi-part/complete', {
                        sendBackData: {
                            key: state.key,
                            uploadId: state.uploadId,
                            fileName
                        },
                        parts: sortedParts
                    });
                    break;
                } catch (error) {
                    retryCount++;
                    await handleRetryableError(error, retryCount);
                }
            }
        } catch (error) {
            await cleanupUpload(fileName, state);
            throw error;
        }
    };

    const initializeMultiPartUpload = async (
        fileName: string,
        fileId: string,
        contentType: string,
        totalSize: number
    ): Promise<StreamingState> => {
        let retryCount = -1;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const createRes = await axios.post('/api/s3-upload/multi-part/create', {
                    fileInfo: {
                        type: contentType,
                        originalName: fileName,
                        fileId
                    }
                });

                return {
                    uploadId: createRes.data.uploadId,
                    key: createRes.data.key,
                    completedParts: [],
                    totalUploaded: 0,
                    lastFailedPart: null,
                    buffer: [],
                    bufferSize: 0,
                    partNumber: 1,
                    abortController: new AbortController(),
                    downloadedBytes: 0,
                    totalSize
                };
            } catch (error) {
                retryCount++;
                await handleRetryableError(error, retryCount);
            }
        }
        throw new Error('Failed to initialize upload');
    };

    const uploadBufferedPart = async (
        state: StreamingState,
        fileName: string,
    ): Promise<StreamingState> => {
        if (state.bufferSize === 0) return state;

        const chunk = new Blob(state.buffer, { type: 'application/octet-stream' });
        let retryCount = -1;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const partRes = await axios.post('/api/s3-upload/multi-part/part', {
                    sendBackData: {
                        key: state.key,
                        uploadId: state.uploadId
                    },
                    partNumber: state.partNumber,
                    contentLength: chunk.size,
                });

                const uploadResult = await axios.put(partRes.data.url, chunk, {
                    headers: { 'Content-Type': 'application/octet-stream' },
                    signal: state.abortController.signal,
                    onUploadProgress: (progressEvent) => {
                        if (!progressEvent.total) return;

                        const completedSize = state.totalUploaded;
                        const currentProgress = (progressEvent.loaded / progressEvent.total) * chunk.size;
                        const uploadProgress = ((completedSize + currentProgress) / state.totalSize) * 100;

                        updateUploadStatus(fileName, {
                            progress: Math.min(calculateOverallProgress(
                                (state.downloadedBytes / state.totalSize) * 100,
                                uploadProgress
                            ), 99),
                            status: 'uploading'
                        });
                    }
                });

                return {
                    ...state,
                    buffer: [],
                    bufferSize: 0,
                    completedParts: [
                        ...state.completedParts,
                        {
                            ETag: uploadResult.headers['etag'],
                            PartNumber: state.partNumber
                        }
                    ],
                    totalUploaded: state.totalUploaded + chunk.size,
                    partNumber: state.partNumber + 1
                };

            } catch (error) {
                retryCount++;
                await handleRetryableError(error, retryCount);

                state.lastFailedPart = state.partNumber;
            }
        }
        throw new Error('Failed to upload part');
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();

        const links = urls.trim().split('\n').filter(url => url.trim());

        if (links.length === 0) {
            toast.error('Please enter at least one valid URL');
            return;
        }

        setUploadingFiles([]);
        setIsUploading(true);

        try {
            const linksToUpload: QueuedLink[] = [];

            for (const url of links) {
                try {
                    const headResponse = await axios.post('/api/s3-upload/link', {
                        url: url.trim(),
                        method: 'HEAD'
                    });

                    const contentType = headResponse.data.contentType;
                    const contentLength = parseInt(headResponse.data.contentLength || '0');

                    if (!contentType || !contentLength) {
                        toast.error(`Invalid file at URL: ${url.trim()} - Missing content type or size`);
                        continue;
                    }

                    const fileName = extractFileName(url.trim());
                    const fileId = uuidv4();

                    linksToUpload.push({
                        url: url.trim(),
                        fileName,
                        fileId,
                        size: contentLength,
                        type: contentType
                    });
                } catch (error) {
                    const errorMessage = axios.isAxiosError(error)
                        ? error.response?.data?.error
                        : 'Invalid URL';
                    toast.error(`Error validating URL: ${url.trim()} - ${errorMessage}`);
                }
            }

            if (linksToUpload.length === 0) {
                setIsUploading(false);
                return;
            };

            setUploadingFiles(linksToUpload.map(link => ({
                name: link.fileName,
                size: link.size,
                fileId: link.fileId
            })));

            initializeSSEConnection(
                () => onUploadSuccess(true),
                () => setIsUploading(false)
            );

            for (const link of linksToUpload) {
                try {
                    updateUploadStatus(link.fileName, {
                        progress: 0,
                        status: 'uploading'
                    });

                    if (link.size <= SINGLE_PART_UPLOAD_LIMIT) {
                        await singlePartUpload(
                            link.url,
                            link.fileName,
                            link.fileId,
                            link.size,
                            link.type
                        );
                    } else {
                        await multiPartUpload(
                            link.url,
                            link.fileName,
                            link.fileId,
                            link.size,
                            link.type
                        );
                    }

                    updateUploadStatus(link.fileName, {
                        progress: 99,
                        status: 'processing'
                    });
                } catch (error) {
                    const errorMessage = axios.isAxiosError(error)
                        ? error.response?.data?.error
                        : error instanceof Error
                            ? error.message
                            : 'Import failed';

                    updateUploadStatus(link.fileName, {
                        progress: 0,
                        status: 'failed',
                        error: errorMessage
                    });
                    toast.error(`Error importing ${link.fileName}: ${errorMessage}`);
                }
            }
        } catch (error) {
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.error
                : error instanceof Error
                    ? error.message
                    : 'Import failed';
            toast.error(`Import failed: ${errorMessage}`);
            setIsUploading(false);
        } finally {
            setUrls('');
        }
    };

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (uploadingFiles.length > 0) {
                event.preventDefault()
                event.returnValue = ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [uploadingFiles]);

    return (
        <div className='bg-white flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-primary shadow-sm'>
            <div className={cn(
                'group relative w-full rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]',
                isUploading && 'opacity-50 cursor-not-allowed'
            )}>
                <div className='w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                    <div className='flex gap-3 text-base font-medium leading-6 text-gray-800'>
                        <FileUp className="text-gray-800" />
                        <div>Link importer</div>
                    </div>
                    <div className='text-xs self-stretch mt-4 leading-5 text-center text-gray-700 max-md:mr-1 max-md:max-w-full'>
                        {isUploading
                            ? 'Please wait for current uploads to complete'
                            : 'Please enter the link to the media file in the box below, one per line. Please note that the file must be publicly accessible to be imported.'
                        }
                    </div>
                    <form onSubmit={handleImport} className='flex w-full items-center gap-4 mt-4'>
                        <textarea
                            value={urls}
                            onChange={(e) => setUrls(e.target.value)}
                            placeholder="Enter audio/video file download links, one per line, e.g. https://scribie.com/samples/example.mp3"
                            className={cn(
                                'flex-1 px-4 py-2 rounded-lg border border-primary',
                                'placeholder:text-gray-500 focus:outline-none',
                                'text-sm min-h-[80px] overflow-hidden resize-none text-gray-900',
                                isUploading && 'cursor-not-allowed opacity-50'
                            )}
                            style={{
                                minHeight: '80px',
                                height: `${Math.max(80, urls.split('\n').length * 24)}px`
                            }}
                            disabled={isUploading}
                        />
                        <button
                            type="submit"
                            disabled={isUploading}
                            className={cn(
                                'px-5 py-2 bg-white rounded-[32px] text-gray-800 font-medium border border-primary',
                                'hover:bg-gray-50 transition-colors',
                                'flex items-center gap-2 shrink-0',
                                isUploading && 'opacity-50 cursor-not-allowed hover:bg-white'
                            )}
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Import
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LinkImporter;