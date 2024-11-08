'use client';

import axios from 'axios';
import { FileUp } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useUpload } from '@/app/context/UploadProvider';
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES } from '@/constants';
import { StreamingState, QueuedLink, UploaderProps } from '@/types/upload';
import { handleRetryableError, calculateOverallProgress } from '@/utils/uploadUtils';

const LinkImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
    const { setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
    const [urls, setUrls] = useState('');

    const uploadStatesRef = useRef<Record<string, StreamingState>>({});

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
            const downloadResponse = await fetch('/api/s3-upload/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
                signal: state.abortController.signal
            });

            if (!downloadResponse.ok || !downloadResponse.body) {
                throw new Error('Download failed');
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
                        status: 'uploading'
                    });

                    if (state.bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
                        state = await uploadBufferedPart(state, fileName);
                    }
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
            fileId: uuidv4(),
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

                    linksToUpload.push({
                        ...file,
                        fileName: file.name,
                        size: contentLength,
                        type: contentType
                    });

                    updateUploadStatus(file.name, {
                        progress: 0,
                        status: 'uploading'
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
        }
    };

    return (
        <div className='bg-white flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-primary shadow-sm'>
            <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                    <div className='flex gap-3 text-base font-medium leading-6 text-gray-800'>
                        <FileUp className="text-gray-800" />
                        <h4>Link Importer</h4>
                    </div>
                    <div className='text-xs self-stretch mt-4 leading-5 text-center text-gray-700 max-md:mr-1 max-md:max-w-full'>
                        Please enter the link to the media file in the box below, one per line. Please note that the file must be publicly accessible to be imported.
                    </div>
                    <form onSubmit={handleImport} className='flex w-full items-center gap-4 mt-4'>
                        <textarea
                            value={urls}
                            onChange={(e) => setUrls(e.target.value)}
                            placeholder="Enter audio/video file download links, one per line, e.g. https://scribie.com/samples/example.mp3"
                            className="flex-1 px-4 py-2 rounded-lg border border-primary placeholder:text-gray-500 focus:outline-none text-sm min-h-[80px] overflow-hidden resize-none text-gray-900"
                            style={{
                                minHeight: '80px',
                                height: `${Math.max(80, urls.split('\n').length * 24)}px`
                            }}
                        />
                        <button
                            type="submit"
                            className="px-5 py-2 bg-white rounded-[32px] text-gray-800 font-medium border border-primary hover:bg-gray-50 transition-colors"
                        >
                            Import
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LinkImporter;