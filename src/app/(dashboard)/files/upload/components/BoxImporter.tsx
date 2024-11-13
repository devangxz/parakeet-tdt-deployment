'use client';

import axios from 'axios';
import { FileUp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useUpload } from '@/app/context/UploadProvider';
import { ALLOWED_FILE_TYPES, SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES } from '@/constants';
import { StreamingState, BoxFile, BoxSelect, UploaderProps } from '@/types/upload';
import { handleRetryableError, calculateOverallProgress } from '@/utils/uploadUtils';
import validateFileType from '@/utils/validateFileType';

const BOX_CLIENT_ID = process.env.NEXT_PUBLIC_BOX_CLIENT_ID!;

const BoxImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
    const { setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const uploadStatesRef = useRef<Record<string, StreamingState>>({});
    const authWindowRef = useRef<Window | null>(null);
    const boxSelectRef = useRef<BoxSelect | null>(null);

    const getFileTypeFromExtension = (fileName: string): string => {
        const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
        const allowedMimeTypes = ALLOWED_FILE_TYPES[fileExtension as keyof typeof ALLOWED_FILE_TYPES];

        return allowedMimeTypes?.[0] || 'invalid';
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

    const singlePartUpload = async (file: BoxFile, fileId: string, token: string): Promise<void> => {
        const abortController = new AbortController();

        let retryCount = -1;
        let downloadedBytes = 0;
        const totalSize = file.size;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const downloadResponse = await fetch(
                    `https://api.box.com/2.0/files/${file.id}/content`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` },
                        signal: abortController.signal
                    }
                );

                if (!downloadResponse.ok || !downloadResponse.body) {
                    throw new Error('Failed to get file stream from Box');
                }

                const reader = downloadResponse.body.getReader();
                const chunks: Uint8Array[] = [];

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    downloadedBytes += value.length;
                    const downloadProgress = (downloadedBytes / totalSize) * 100;

                    updateUploadStatus(file.name, {
                        progress: Math.min(calculateOverallProgress(downloadProgress, 0), 99),
                        status: 'uploading'
                    });
                }

                const blob = new Blob(chunks, { type: file.type });

                const formData = new FormData();
                formData.append('file', blob, file.name);
                formData.append('fileId', fileId);

                await axios.post('/api/s3-upload/single-part', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    signal: abortController.signal,
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            const uploadProgress = (progressEvent.loaded / progressEvent.total) * 100;
                            updateUploadStatus(file.name, {
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
        file: BoxFile,
        fileId: string
    ): Promise<StreamingState> => {
        let retryCount = -1;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const createRes = await axios.post('/api/s3-upload/multi-part/create', {
                    fileInfo: {
                        type: file.type,
                        originalName: file.name,
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
                    totalSize: file.size
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
                    contentLength: chunk.size
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

    const multiPartUpload = async (file: BoxFile, fileId: string, token: string): Promise<void> => {
        let state = await initializeMultiPartUpload(file, fileId);
        uploadStatesRef.current[file.name] = state;

        try {
            const downloadResponse = await fetch(
                `https://api.box.com/2.0/files/${file.id}/content`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: state.abortController.signal
                }
            );

            if (!downloadResponse.ok || !downloadResponse.body) {
                throw new Error('Failed to get file stream from Box');
            }

            const reader = downloadResponse.body.getReader();

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    if (state.bufferSize > 0) {
                        state = await uploadBufferedPart(state, file.name);
                    }
                    break;
                }

                if (value) {
                    state.buffer.push(value);
                    state.bufferSize += value.length;
                    state.downloadedBytes += value.length;

                    updateUploadStatus(file.name, {
                        progress: Math.min(calculateOverallProgress(
                            (state.downloadedBytes / state.totalSize) * 100,
                            (state.totalUploaded / state.totalSize) * 100
                        ), 99),
                        status: 'uploading'
                    });

                    if (state.bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
                        state = await uploadBufferedPart(state, file.name);
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
                            fileName: file.name
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
            await cleanupUpload(file.name, state);
            throw error;
        }
    };

    const uploadFile = async (file: BoxFile): Promise<void> => {
        updateUploadStatus(file.name, {
            progress: 0,
            status: 'uploading'
        });

        const fileId = uuidv4();

        try {
            const tokenResponse = await axios.get('/api/s3-upload/box/token');
            if (!tokenResponse.data.token) {
                throw new Error('Failed to get valid authentication token');
            }

            if (file.size <= SINGLE_PART_UPLOAD_LIMIT) {
                await singlePartUpload(file, fileId, tokenResponse.data.token);
            } else {
                await multiPartUpload(file, fileId, tokenResponse.data.token);
            }

            updateUploadStatus(file.name, {
                progress: 99,
                status: 'processing'
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Import failed';
            updateUploadStatus(file.name, {
                progress: 0,
                status: 'failed',
                error: errorMessage
            });
            toast.error(`Error importing ${file.name}: ${errorMessage}`);
        }
    };

    const handlePickerCallback = async (files: BoxFile[]) => {
        if (!files || files.length === 0) {
            toast.error('Please select one or more files to import');
            return;
        }

        if (isUploading) {
            toast.error("Please wait for current uploads to complete before starting new uploads");
            return;
        }

        try {
            const filesWithTypes = files.map(file => ({
                ...file,
                type: getFileTypeFromExtension(file.name)
            }));

            const allowedFiles = filesWithTypes.filter(file => validateFileType(file as unknown as File));
            const rejectedFiles = filesWithTypes.filter(file => !validateFileType(file as unknown as File));

            if (rejectedFiles.length > 0) {
                toast.error(`${rejectedFiles.length} ${rejectedFiles.length === 1 ? 'file was' : 'files were'} rejected due to unsupported file type.`);
            }

            if (allowedFiles.length === 0) return;

            const processedFiles = allowedFiles.map(file => ({
                id: file.id,
                name: file.name,
                size: file.size,
                type: file.type
            }));

            setIsUploading(true);
            setUploadingFiles(processedFiles.map((file) => ({
                name: file.name,
                size: file.size,
                fileId: file.id,
            })));

            initializeSSEConnection(
                () => onUploadSuccess(true),
                () => setIsUploading(false)
            );

            for (const file of processedFiles) {
                await uploadFile(file);
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
    
    const showPicker = useCallback(async () => {
        if (!window.BoxSelect) {
            toast.error('BoxSelect not initialized');
            return;
        }

        try {
            const tokenResponse = await axios.get('/api/s3-upload/box/token');
            if (!tokenResponse.data.token) {
                throw new Error('Failed to get valid token');
            }

            boxSelectRef.current = new window.BoxSelect({
                clientId: BOX_CLIENT_ID,
                linkType: 'direct',
                multiselect: true,
                token: tokenResponse.data.token,
            });

            boxSelectRef.current.success((files: BoxFile[]) => {
                handlePickerCallback(files);
            });

            boxSelectRef.current.launchPopup();
        } catch (error) {
            toast.error('Failed to open file picker. Please try authenticating again.');
            setIsAuthenticated(false);
        }
    }, [handlePickerCallback]);

    const authenticate = useCallback(async () => {
        try {
            const left = window.screenX + (window.outerWidth - 600) / 2;
            const top = window.screenY + (window.outerHeight - 600) / 2;
            
            const popup = window.open(
                '/api/s3-upload/box/auth',
                'BoxAuth',
                `width=${600},height=${600},left=${left},top=${top}`
            );
    
            if (!popup) {
                throw new Error('Popup blocked. Please enable popups and try again.');
            }
    
            authWindowRef.current = popup;
    
            await new Promise<void>((resolve, reject) => {
                const handleAuthMessage = async (event: MessageEvent) => {
                    if (event.data?.type === 'BOX_AUTH_SUCCESS') {
                        window.removeEventListener('message', handleAuthMessage);
                        setIsAuthenticated(true);
                        resolve();
                    } else if (event.data?.type === 'BOX_AUTH_ERROR') {
                        window.removeEventListener('message', handleAuthMessage);
                        reject(new Error('Authentication failed'));
                    }
                };
    
                window.addEventListener('message', handleAuthMessage);
    
                const checkPopup = setInterval(() => {
                    if (authWindowRef.current?.closed) {
                        clearInterval(checkPopup);
                        window.removeEventListener('message', handleAuthMessage);
                        reject(new Error('Authentication window was closed'));
                    }
                }, 500);
            });
    
            await showPicker();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            toast.error(errorMessage);
            setIsAuthenticated(false);
        } finally {
            if (authWindowRef.current) {
                authWindowRef.current = null;
            }
        }
    }, [showPicker]);

    const handleBoxAction = useCallback(async () => {
        try {
            if (isUploading) {
                toast.error("Please wait for current uploads to complete before starting new uploads");
                return;
            }

            const validationResponse = await axios.get('/api/s3-upload/box/token/validate');
            if (validationResponse.data.isValid) {
                await showPicker();
                return;
            }

            setIsAuthenticated(false);
            await authenticate();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Box';
            toast.error(errorMessage);
            setIsAuthenticated(false);
        }
    }, [isUploading, authenticate, showPicker]);

    useEffect(() => {
        const loadBoxScript = async () => {
            try {
                await new Promise<void>((resolve, reject) => {
                    document.querySelectorAll('script[src*="box.com"]')
                        .forEach(script => script.remove());

                    const script = document.createElement('script');
                    script.src = 'https://app.box.com/js/static/select.js';
                    script.async = true;

                    script.onload = () => {
                        setTimeout(resolve, 100);
                    };

                    script.onerror = () => {
                        reject(new Error('Failed to load Box script'));
                    };

                    document.body.appendChild(script);
                });

                if (!window.BoxSelect) {
                    throw new Error('BoxSelect failed to initialize');
                }

                const validationResponse = await axios.get('/api/s3-upload/box/token/validate');
                setIsAuthenticated(validationResponse.data.isValid);
                setIsInitialized(true);
            } catch (error) {
                toast.error('Failed to initialize Box integration');
                setIsAuthenticated(false);
            }
        };

        loadBoxScript();

        return () => {
            document.querySelectorAll('script[src*="box.com"]')
                .forEach(script => script.remove());
            if (boxSelectRef.current) {
                boxSelectRef.current = null;
            }
        };
    }, []);

    if (!isInitialized) {
        return (
            <div className='bg-[#0061d5] flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-[#0061d5] shadow-sm'>
                <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                    <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                        <div className='text-white'>Initializing Box...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='bg-[#0061d5] flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-[#0061d5] shadow-sm'>
            <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                    <div className='flex gap-3 text-base font-medium leading-6 text-white'>
                        <FileUp className="text-white" />
                        <h4>Box Importer</h4>
                    </div>
                    <div className='text-xs self-stretch mt-4 leading-5 text-center text-white max-md:mr-1 max-md:max-w-full'>
                        Select files from your Box account to import. Please allow Scribie.ai Importer in the popup to access your Box files for the import process. We will only access the selected files.
                    </div>
                    <button
                        onClick={handleBoxAction}
                        className='mt-4 px-5 py-2 bg-white rounded-[32px] text-[#0061d5] font-medium border border-white hover:bg-gray-100 transition-colors'
                    >
                        {isAuthenticated ? 'Select Files' : 'Connect to Box'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoxImporter;