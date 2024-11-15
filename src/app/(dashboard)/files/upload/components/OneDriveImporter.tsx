'use client';

import axios from 'axios';
import { FileUp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useUpload } from '@/app/context/UploadProvider';
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES } from '@/constants';
import { StreamingState, OneDrivePickerResponse, OneDriveGraphApiFileResponse, OneDriveFile, UploaderProps } from '@/types/upload';
import { handleRetryableError, calculateOverallProgress } from '@/utils/uploadUtils';
import { getAllowedFileExtensions } from '@/utils/validateFileType';

const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID!;

const OneDriveImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
    const { setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const uploadStatesRef = useRef<Record<string, StreamingState>>({});

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

    const singlePartUpload = async (file: OneDriveFile, fileId: string, token: string): Promise<void> => {
        const abortController = new AbortController();

        let retryCount = -1;
        let downloadedBytes = 0;
        const totalSize = file.size;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const downloadResponse = await fetch(
                    `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` },
                        signal: abortController.signal
                    }
                );

                if (!downloadResponse.ok || !downloadResponse.body) {
                    throw new Error('Failed to get file stream from OneDrive');
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

                const blob = new Blob(chunks, { type: file.mimeType });

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

    const multiPartUpload = async (file: OneDriveFile, fileId: string, token: string): Promise<void> => {
        let state = await initializeMultiPartUpload(file, fileId);
        uploadStatesRef.current[file.name] = state;

        try {
            const downloadResponse = await fetch(
                `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: state.abortController.signal
                }
            );

            if (!downloadResponse.ok || !downloadResponse.body) {
                throw new Error('Failed to get file stream from OneDrive');
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

    const initializeMultiPartUpload = async (
        file: OneDriveFile,
        fileId: string
    ): Promise<StreamingState> => {
        let retryCount = -1;

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const createRes = await axios.post('/api/s3-upload/multi-part/create', {
                    fileInfo: {
                        type: file.mimeType,
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

    const uploadFile = async (file: OneDriveFile, accessToken: string): Promise<void> => {
        updateUploadStatus(file.name, {
            progress: 0,
            status: 'uploading'
        });

        const fileId = uuidv4();

        try {
            if (file.size <= SINGLE_PART_UPLOAD_LIMIT) {
                await singlePartUpload(file, fileId, accessToken);
            } else {
                await multiPartUpload(file, fileId, accessToken);
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

    const getFileDetails = async (fileId: string, accessToken: string): Promise<OneDriveFile | null> => {
        try {
            const response = await axios.get<OneDriveGraphApiFileResponse>(
                `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json'
                    }
                }
            );

            return {
                id: response.data.id,
                name: response.data.name,
                size: response.data.size,
                mimeType: response.data.file?.mimeType || 'invalid'
            };
        } catch (error) {
            return null;
        }
    };

    const handlePickerCallback = async (pickerResponse: OneDrivePickerResponse) => {
        if (!pickerResponse.value || pickerResponse.value.length === 0) {
            toast.error('Please select one or more files to import');
            return;
        }

        if (isUploading) {
            toast.error("Please wait for current uploads to complete before starting new uploads");
            return;
        }

        try {
            let tokenResponse = await axios.get('/api/s3-upload/one-drive/token');
            if (!tokenResponse.data.token) {
                const refreshSuccess = await refreshToken();
                if (refreshSuccess) {
                    tokenResponse = await axios.get('/api/s3-upload/one-drive/token');
                } else {
                    throw new Error('Failed to get valid authentication token');
                }
            }

            const fileDetailsPromises = pickerResponse.value.map(item =>
                getFileDetails(item.id, tokenResponse.data.token)
            );

            const fileDetails = await Promise.all(fileDetailsPromises);
            const validFiles = fileDetails.filter((file): file is OneDriveFile => file !== null);

            if (validFiles.length === 0) {
                throw new Error('Failed to get file details');
            }

            setIsUploading(true);
            setUploadingFiles(validFiles.map(file => ({
                name: file.name,
                size: file.size,
                fileId: file.id,
            })));

            initializeSSEConnection(
                () => onUploadSuccess(true),
                () => setIsUploading(false)
            );

            for (const file of validFiles) {
                await uploadFile(file, tokenResponse.data.token);
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

    const refreshToken = async (): Promise<boolean> => {
        try {
            const refreshResponse = await axios.get('/api/s3-upload/one-drive/token/refresh');
            if (refreshResponse.data.success) {
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            setIsAuthenticated(false);
            return false;
        }
    };

    const showPicker = useCallback(async () => {
        const options = {
            clientId: ONEDRIVE_CLIENT_ID,
            action: "query",
            multiSelect: true,
            advanced: {
                filter: `folder,${getAllowedFileExtensions().join(',')}`,
                endpointHint: "api.onedrive.com"
            },
            success: (response: OneDrivePickerResponse) => {
                handlePickerCallback(response);
            },
            error: () => {
                toast.error('Failed to select files. Please try again.');
            }
        };

        try {
            window.OneDrive.open(options);
        } catch (error) {
            toast.error('Failed to open file picker. Please try authenticating again.');
            setIsAuthenticated(false);
        }
    }, [handlePickerCallback, isUploading]);

    const getTokenAndShowPicker = async () => {
        try {
            let tokenResponse = await axios.get('/api/s3-upload/one-drive/token');
            if (!tokenResponse.data.token) {
                const refreshSuccess = await refreshToken();
                if (refreshSuccess) {
                    tokenResponse = await axios.get('/api/s3-upload/one-drive/token');
                } else {
                    throw new Error('Failed to get valid token');
                }
            }

            await showPicker();
        } catch (error) {
            toast.error('Failed to get access token. Please try authenticating again.');
            setIsAuthenticated(false);
        }
    };

    const authenticate = useCallback(async () => {
        try {
            const left = window.screenX + (window.outerWidth - 600) / 2;
            const top = window.screenY + (window.outerHeight - 600) / 2;

            const popup = window.open(
                '/api/s3-upload/one-drive/auth',
                'OneDriveAuth',
                `width=${600},height=${600},left=${left},top=${top}`
            );

            if (!popup) {
                throw new Error('Popup blocked. Please enable popups and try again.');
            }

            await new Promise<void>((resolve, reject) => {
                const handleAuthMessage = async (event: MessageEvent) => {
                    if (event.data?.type === 'ONEDRIVE_AUTH_SUCCESS') {
                        window.removeEventListener('message', handleAuthMessage);
                        setIsAuthenticated(true);
                        resolve();
                    } else if (event.data?.type === 'ONEDRIVE_AUTH_ERROR') {
                        window.removeEventListener('message', handleAuthMessage);
                        reject(new Error('Authentication failed'));
                    }
                };

                window.addEventListener('message', handleAuthMessage);

                const checkPopup = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkPopup);
                        window.removeEventListener('message', handleAuthMessage);
                        reject(new Error('Authentication window was closed'));
                    }
                }, 500);
            });

            await getTokenAndShowPicker();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            toast.error(errorMessage);
            setIsAuthenticated(false);
        }
    }, [showPicker]);

    const handleDriveAction = useCallback(async () => {
        try {
            if (isUploading) {
                toast.error("Please wait for current uploads to complete before starting new uploads");
                return;
            }

            const validationResponse = await axios.get('/api/s3-upload/one-drive/token/validate');
            if (validationResponse.data.isValid) {
                setIsAuthenticated(true);
                await getTokenAndShowPicker();
                return;
            }

            if (validationResponse.data.needsRefresh) {
                const refreshSuccess = await refreshToken();
                if (refreshSuccess) {
                    await getTokenAndShowPicker();
                    return;
                }
            }

            setIsAuthenticated(false);
            await authenticate();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to OneDrive';
            toast.error(errorMessage);
            setIsAuthenticated(false);
        }
    }, [isUploading, authenticate, showPicker]);

    useEffect(() => {
        const loadOneDriveScript = async () => {
            try {
                await new Promise<void>((resolve, reject) => {
                    document.querySelectorAll('script[src*="onedrive.js"]')
                        .forEach(script => script.remove());

                    const script = document.createElement('script');
                    script.src = 'https://js.live.net/v7.2/OneDrive.js';
                    script.async = true;

                    script.onload = () => {
                        setTimeout(resolve, 100);
                    };

                    script.onerror = () => {
                        reject(new Error('Failed to load OneDrive script'));
                    };

                    document.body.appendChild(script);
                });

                if (!window.OneDrive) {
                    throw new Error('OneDrive failed to initialize');
                }

                const validationResponse = await axios.get('/api/s3-upload/one-drive/token/validate');
                if (validationResponse.data.isValid) {
                    setIsAuthenticated(true);
                } else if (validationResponse.data.needsRefresh) {
                    await refreshToken();
                } else {
                    setIsAuthenticated(false);
                }
                setIsInitialized(true);
            } catch (error) {
                toast.error('Failed to initialize OneDrive integration');
                setIsAuthenticated(false);
            }
        };

        loadOneDriveScript();

        return () => {
            document.querySelectorAll('script[src*="onedrive.js"]')
                .forEach(script => script.remove());
        };
    }, []);

    if (!isInitialized) {
        return (
            <div className='bg-[#00008B] flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-[#00008B] shadow-sm'>
                <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                    <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                        <div className='text-white'>Initializing OneDrive...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='bg-[#00008B] flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-[#00008B] shadow-sm'>
            <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                    <div className='flex gap-3 text-base font-medium leading-6 text-white'>
                        <FileUp className="text-white" />
                        <h4>OneDrive Importer</h4>
                    </div>
                    <div className='text-xs self-stretch mt-4 leading-5 text-center text-white max-md:mr-1 max-md:max-w-full'>
                        <>Select files from your OneDrive to import. Please allow Scribie.ai Importer in the popup to access your OneDrive files for the import process. We will only access the selected files. The permissions can be revoked from your <a href="https://account.microsoft.com/permissions" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Microsoft Account Settings</a> page anytime.</>
                    </div>
                    <button
                        onClick={handleDriveAction}
                        className='mt-4 px-5 py-2 bg-white rounded-[32px] text-[#00008B] font-medium border border-white hover:bg-gray-100 transition-colors'
                    >
                        {isAuthenticated ? 'Select Files' : 'Connect to OneDrive'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OneDriveImporter;