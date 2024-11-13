'use client';

import axios from 'axios';
import { FileUp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useUpload } from '@/app/context/UploadProvider';
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES } from '@/constants';
import { StreamingState, GoogleDriveFile, GooglePickerResponse, UploaderProps } from '@/types/upload';
import { handleRetryableError, calculateOverallProgress } from '@/utils/uploadUtils';
import { getAllowedMimeTypes } from '@/utils/validateFileType';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!;

const GoogleDriveImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
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

    const singlePartUpload = async (file: GoogleDriveFile, fileId: string, token: string): Promise<void> => {
        const abortController = new AbortController();

        let retryCount = -1;
        let downloadedBytes = 0;
        const totalSize = parseInt(file.sizeBytes);

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const downloadResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` },
                        signal: abortController.signal
                    }
                );

                if (!downloadResponse.ok || !downloadResponse.body) {
                    throw new Error('Failed to get file stream from Google Drive');
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

    const initializeMultiPartUpload = async (
        file: GoogleDriveFile,
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
                    totalSize: parseInt(file.sizeBytes)
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

    const multiPartUpload = async (file: GoogleDriveFile, fileId: string, token: string): Promise<void> => {
        let state = await initializeMultiPartUpload(file, fileId);
        uploadStatesRef.current[file.name] = state;

        try {
            const downloadResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: state.abortController.signal
                }
            );

            if (!downloadResponse.ok || !downloadResponse.body) {
                throw new Error('Failed to get file stream from Google Drive');
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

    const uploadFile = async (file: GoogleDriveFile): Promise<void> => {
        updateUploadStatus(file.name, {
            progress: 0,
            status: 'uploading'
        });

        const fileId = uuidv4();

        try {
            let tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
            if (!tokenResponse.data.token) {
                const refreshSuccess = await refreshToken();
                if (refreshSuccess) {
                    tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
                } else {
                    throw new Error('Failed to get valid authentication token');
                }
            }

            const fileSize = parseInt(file.sizeBytes);
            if (fileSize <= SINGLE_PART_UPLOAD_LIMIT) {
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

    const handlePickerCallback = async (data: GooglePickerResponse) => {
        if (data.action !== window.google.picker.Action.PICKED) return;

        if (isUploading) {
            toast.error("Please wait for current uploads to complete before starting new uploads");
            return;
        }

        const selectedFiles = data.docs;

        if (selectedFiles.length === 0) {
            toast.error('No valid files selected. Please select supported audio or video files.');
            return;
        }

        setIsUploading(true);
        setUploadingFiles(selectedFiles.map((file: GoogleDriveFile) => ({
            name: file.name,
            size: parseInt(file.sizeBytes),
            fileId: file.id
        })));

        try {
            initializeSSEConnection(
                () => onUploadSuccess(true),
                () => setIsUploading(false)
            );

            for (const file of selectedFiles) {
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
        } finally {
            setIsUploading(false);
        }
    };

    const refreshToken = async (): Promise<boolean> => {
        try {
            const refreshResponse = await axios.get('/api/s3-upload/google-drive/token/refresh');
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

    const showPicker = useCallback(async (accessToken: string) => {
        if (!window.google?.picker || !accessToken) return;

        try {
            const { status } = await axios.get(
                `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
            );

            if (status !== 200) {
                throw new Error('Invalid token');
            }

            const view = new window.google.picker.DocsView()
                .setMimeTypes(getAllowedMimeTypes().join(','))
                .setIncludeFolders(true);

            const picker = new window.google.picker.PickerBuilder()
                .addView(view)
                .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
                .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
                .setTitle('Select Files')
                .setAppId(GOOGLE_APP_ID)
                .setOAuthToken(accessToken)
                .setDeveloperKey(GOOGLE_API_KEY)
                .setCallback(handlePickerCallback)
                .build();

            picker.setVisible(true);
        } catch (error) {
            toast.error('Failed to open file picker. Please try authenticating again.');
            setIsAuthenticated(false);
        }
    }, [handlePickerCallback]);

    const getTokenAndShowPicker = async () => {
        try {
            let tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
            if (!tokenResponse.data.token) {
                const refreshSuccess = await refreshToken();
                if (refreshSuccess) {
                    tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
                } else {
                    throw new Error('Failed to get valid token');
                }
            }

            await showPicker(tokenResponse.data.token);
        } catch (error) {
            toast.error('Failed to get access token. Please try authenticating again.');
            setIsAuthenticated(false);
        }
    };

    const authenticate = useCallback(async () => {
        if (!window.google?.accounts?.oauth2) {
            toast.error('Failed to initialize Google authentication');
            return;
        }

        const tokenClient = window.google.accounts.oauth2.initCodeClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            ux_mode: 'popup',
            callback: async (response: { error?: string; code?: string }) => {
                if (response.error) {
                    toast.error('Authentication failed. Please try again.');
                    return;
                }

                try {
                    const result = await axios.post('/api/s3-upload/google-drive/auth', {
                        code: response.code
                    });

                    if (result.data.success) {
                        setIsAuthenticated(true);
                        await getTokenAndShowPicker();
                    } else {
                        throw new Error('Authentication failed');
                    }
                } catch {
                    toast.error('Authentication failed. Please try again.');
                }
            },
        });

        tokenClient.requestCode();
    }, [showPicker]);

    const handleDriveAction = useCallback(async () => {
        try {
            if (isUploading) {
                toast.error("Please wait for current uploads to complete before starting new uploads");
                return;
            }

            const validationResponse = await axios.get('/api/s3-upload/google-drive/token/validate');
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
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Drive';
            toast.error(errorMessage);
            setIsAuthenticated(false);
        }
    }, [isUploading, authenticate, showPicker]);

    useEffect(() => {
        const loadGoogleAPIs = async () => {
            try {
                await Promise.all([
                    new Promise<void>((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://apis.google.com/js/api.js';
                        script.onload = () => resolve();
                        document.body.appendChild(script);
                    }),
                    new Promise<void>((resolve) => {
                        const script = document.createElement('script');
                        script.src = 'https://accounts.google.com/gsi/client';
                        script.onload = () => resolve();
                        document.body.appendChild(script);
                    })
                ]);

                await new Promise<void>((resolve) => {
                    window.gapi.load('picker', () => resolve());
                });

                const validationResponse = await axios.get('/api/s3-upload/google-drive/token/validate');
                if (validationResponse.data.isValid) {
                    setIsAuthenticated(true);
                } else if (validationResponse.data.needsRefresh) {
                    await refreshToken();
                } else {
                    setIsAuthenticated(false);
                }
                setIsInitialized(true);
            } catch (error) {
                toast.error('Failed to initialize Google Drive integration');
                setIsAuthenticated(false);
            }
        };

        loadGoogleAPIs();

        return () => {
            document.querySelectorAll('script[src*="google"]')
                .forEach(script => script.remove());
        };
    }, []);

    if (!isInitialized) {
        return (
            <div className='bg-[#2d9348] flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-[#2d9348] shadow-sm'>
                <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                    <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                        <div className='text-white'>Initializing Google Drive...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='bg-[#2d9348] flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-[#2d9348] shadow-sm'>
            <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                    <div className='flex gap-3 text-base font-medium leading-6 text-white'>
                        <FileUp className="text-white" />
                        <h4>Google Drive Importer</h4>
                    </div>
                    <div className='text-xs self-stretch mt-4 leading-5 text-center text-white max-md:mr-1 max-md:max-w-full'>
                        <>Select files from your Google Drive to import. Please allow Scribie.ai Importer in the popup to access your Google Drive files for the import process. We will only access the selected files. The permissions can be revoked from your <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Google Account Settings</a> page anytime.</>
                    </div>
                    <button
                        onClick={handleDriveAction}
                        className='mt-4 px-5 py-2 bg-white rounded-[32px] text-[#2d9348] font-medium border border-white hover:bg-gray-100 transition-colors'
                    >
                        {isAuthenticated ? 'Select Files' : 'Connect to Drive'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoogleDriveImporter;