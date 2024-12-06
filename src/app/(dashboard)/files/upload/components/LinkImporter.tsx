'use client';

import axios from 'axios';
import Image from 'next/image';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useUpload } from '@/app/context/UploadProvider';
import { MAX_FILE_SIZE, SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES } from '@/constants';
import { StreamingState, QueuedLink, UploaderProps } from '@/types/upload';
import { generateUniqueId } from '@/utils/generateUniqueId';
import { handleRetryableError, calculateOverallProgress } from '@/utils/uploadUtils';

const LinkImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
    const { setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
    const [urls, setUrls] = useState('');

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
                        status: 'importing'
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
                                status: 'importing'
                            });
                        }
                    },
                });
                return;
            } catch (error) {
                retryCount++;
                await handleRetryableError(error, retryCount);

                continue;
            }
        }
    };

    const initializeMultiPartUpload = async (
        fileName: string,
        fileId: string,
        contentType: string,
        totalSize: number,
        url: string
    ): Promise<StreamingState> => {
        let retryCount = -1;

        const checkRes = await axios.post('/api/s3-upload/multi-part/check-session', {
            fileName,
            fileSize: totalSize,
            sourceType: 'link',
            sourceId: url
        });

        if (checkRes.data.exists) {
            return {
                uploadId: checkRes.data.uploadId,
                key: checkRes.data.key,
                completedParts: checkRes.data.parts.map((part: { ETag: string; PartNumber: number }) => ({
                    ETag: part.ETag,
                    PartNumber: part.PartNumber
                })),
                totalUploaded: checkRes.data.parts.length * MULTI_PART_UPLOAD_CHUNK_SIZE,
                lastFailedPart: null,
                buffer: [],
                bufferSize: 0,
                partNumber: Math.max(...checkRes.data.parts.map((p: { PartNumber: number }) => p.PartNumber)) + 1,
                abortController: new AbortController(),
                downloadedBytes: checkRes.data.parts.length * MULTI_PART_UPLOAD_CHUNK_SIZE,
                totalSize
            };
        }

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const createRes = await axios.post('/api/s3-upload/multi-part/create', {
                    fileInfo: {
                        type: contentType,
                        originalName: fileName,
                        fileId,
                        size: totalSize,
                        source: 'link',
                        sourceId: url
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

                continue;
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
                            status: 'importing'
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
                continue;
            }
        }
        throw new Error('Failed to upload part');
    };

    const multiPartUpload = async (
        url: string,
        fileName: string,
        fileId: string,
        contentLength: number,
        contentType: string,
    ): Promise<void> => {
        let state = await initializeMultiPartUpload(fileName, fileId, contentType, contentLength, url);

        try {
            let retryCount = -1;
            while (true) {
                try {
                    const downloadResponse = await fetch('/api/s3-upload/link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            url,
                            range: state.downloadedBytes > 0 ? `bytes=${state.downloadedBytes}-` : undefined
                        }),
                        signal: state.abortController.signal
                    });
                    if (!downloadResponse.ok || !downloadResponse.body) {
                        throw new Error('Download failed');
                    }

                    if (state.completedParts.length > 0) {
                        updateUploadStatus(fileName, {
                            progress: Math.min(calculateOverallProgress(
                                (state.downloadedBytes / state.totalSize) * 100,
                                (state.totalUploaded / state.totalSize) * 100
                            ), 99),
                            status: 'importing'
                        });
                    }

                    const reader = downloadResponse.body.getReader();
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            if (state.bufferSize > 0) {
                                state = await uploadBufferedPart(state, fileName);
                            }
                            break;
                        }

                        if (value) {
                            state.buffer.push(value);
                            state.bufferSize += value.length;
                            state.downloadedBytes += value.length;

                            updateUploadStatus(fileName, {
                                progress: Math.min(calculateOverallProgress(
                                    (state.downloadedBytes / state.totalSize) * 100,
                                    (state.totalUploaded / state.totalSize) * 100
                                ), 99),
                                status: 'importing'
                            });

                            if (state.bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
                                state = await uploadBufferedPart(state, fileName);
                            }
                        }
                    }

                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount >= UPLOAD_MAX_RETRIES) {
                        throw new Error(`File upload failed after ${UPLOAD_MAX_RETRIES} attempts`);
                    }

                    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 10000)));

                    if (!(error instanceof Error && error.message.includes('aborted'))) {
                        state.downloadedBytes = state.totalUploaded;
                    }

                    continue;
                }
            }

            retryCount = -1;
            const sortedParts = state.completedParts.sort((a, b) => a.PartNumber - b.PartNumber);
            while (retryCount <= UPLOAD_MAX_RETRIES) {
                try {
                    await axios.post('/api/s3-upload/multi-part/complete', {
                        sendBackData: {
                            key: state.key,
                            uploadId: state.uploadId,
                            fileId
                        },
                        parts: sortedParts
                    });
                    break;
                } catch (error) {
                    retryCount++;
                    await handleRetryableError(error, retryCount);

                    continue;
                }
            }
        } catch (error) {
            throw error;
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isUploading) {
            toast.error("Please wait for current uploads to complete before starting new uploads");
            return;
        }

        const links = urls.trim().split('\n').filter(url => url.trim());

        if (links.length === 0) {
            toast.error('Please enter at least one valid URL');
            return;
        }

        const initialFiles = links.map(url => ({
            name: extractFileName(url.trim()),
            size: 0,
            fileId: generateUniqueId(),
            url: url.trim()
        }));

        setIsUploading(true);
        setUploadingFiles(initialFiles);
        setUrls('');

        initialFiles.forEach(file => {
            updateUploadStatus(file.name, {
                progress: 0,
                status: 'validating'
            });
        });

        try {
            const linksToUpload: QueuedLink[] = [];

            for (const file of initialFiles) {
                try {
                    const headResponse = await axios.post('/api/s3-upload/link', {
                        url: file.url,
                        method: 'HEAD'
                    });

                    const contentType = headResponse.data.contentType;
                    const contentLength = parseInt(headResponse.data.contentLength || '0');

                    if (!contentType || !contentLength) {
                        toast.error(`Invalid file at URL: ${file.url} - Missing content type or size`);
                        updateUploadStatus(file.name, {
                            progress: 0,
                            status: 'failed',
                            error: 'Invalid file - Missing content type or size'
                        });
                        continue;
                    }

                    if (contentLength > MAX_FILE_SIZE) {
                        toast.error(`Invalid file at URL: ${file.url} - File exceeds 10GB size limit`);
                        updateUploadStatus(file.name, {
                            progress: 0,
                            status: 'failed',
                            error: 'Invalid file - File exceeds 10GB size limit'
                        });
                        continue;
                    }

                    linksToUpload.push({
                        ...file,
                        fileName: file.name,
                        size: contentLength,
                        type: contentType
                    });

                    updateUploadStatus(file.name, {
                        progress: 0,
                        status: 'importing'
                    });
                } catch (error) {
                    const errorMessage = axios.isAxiosError(error)
                        ? error.response?.data?.error
                        : 'Invalid URL';

                    toast.error(`Error validating URL: ${file.url} - ${errorMessage}`);
                    updateUploadStatus(file.name, {
                        progress: 0,
                        status: 'failed',
                        error: `Validation failed - ${errorMessage}`
                    });
                }
            }

            if (linksToUpload.length === 0) {
                setIsUploading(false);
                return;
            };

            setUploadingFiles(linksToUpload.map(link => ({
                name: link.fileName,
                size: link.size,
                fileId: link.fileId,
            })));

            initializeSSEConnection(
                () => onUploadSuccess(true),
                () => setIsUploading(false)
            );

            for (const link of linksToUpload) {
                try {
                    updateUploadStatus(link.fileName, {
                        progress: 0,
                        status: 'importing'
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
                    toast.error(`Import failed for ${link.fileName}. Please note that if you try importing the same file again after a few minutes, it will automatically resume from where it stopped.`);
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
            setIsUploading(false);
        }
    };

    return (
        <div className='bg-white flex flex-col p-[12px] items-center justify-center rounded-[12px] border-2 border-primary shadow-sm'>
            <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                    <div className='flex items-center gap-1 text-base font-medium leading-6 text-gray-800'>
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <Image
                                src="/assets/images/upload/link.svg"
                                alt="Link"
                                width={40}
                                height={40}
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h4 className="flex items-center">Link Importer</h4>
                    </div>
                    <div className='text-xs self-stretch mt-4 leading-5 text-center text-gray-800 max-md:mr-1 max-md:max-w-full'>
                        Please enter the link to the media file in the box below, one per line. Please note that the file must be publicly accessible to be imported.
                    </div>
                    <form onSubmit={handleImport} className='w-full flex flex-col gap-3'>
                        <textarea
                            value={urls}
                            onChange={(e) => setUrls(e.target.value)}
                            placeholder="Enter audio/video file download links, one per line, e.g. https://scribie.com/samples/example.mp3"
                            className="w-full px-4 py-2.5 rounded-lg border border-primary/30 placeholder:text-gray-500 focus:outline-none focus:border-primary text-sm resize-none text-gray-900 overflow-hidden"
                            style={{
                                minHeight: '80px',
                                height: `${Math.max(80, urls.split('\n').length * 24)}px`,
                                overflowY: 'hidden'
                            }}
                        />
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                className="px-5 py-2 bg-primary rounded-[32px] text-white font-medium border border-primary hover:bg-[#5e3ee9] transition-colors"
                            >
                                Import
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LinkImporter;