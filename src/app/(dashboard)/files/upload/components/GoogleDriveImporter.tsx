'use client';

import axios from 'axios';
import { FileUp } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { useUpload } from '@/app/context/UploadProvider';
import { SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES, UPLOAD_RETRY_DELAY } from '@/constants';
import sleep from '@/utils/sleep';
import { getAllowedMimeTypes } from '@/utils/validateFileType';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET!;
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!;

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

interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: string;
}

interface GooglePickerResponse {
    action: string;
    docs: GoogleDriveFile[];
}

interface GoogleDocsView {
    setMimeTypes(mimeTypes: string): GoogleDocsView;
    setIncludeFolders(include: boolean): GoogleDocsView;
}

interface GooglePickerBuilder {
    addView(view: GoogleDocsView): GooglePickerBuilder;
    enableFeature(feature: string): GooglePickerBuilder;
    setTitle(title: string): GooglePickerBuilder;
    setAppId(appId: string): GooglePickerBuilder;
    setOAuthToken(token: string): GooglePickerBuilder;
    setDeveloperKey(key: string): GooglePickerBuilder;
    setCallback(callback: (data: GooglePickerResponse) => void): GooglePickerBuilder;
    build(): GooglePicker;
}

interface GooglePicker {
    setVisible(visible: boolean): void;
}

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
}

declare global {
    interface Window {
        google: {
            accounts: {
                oauth2: {
                    initTokenClient(config: {
                        client_id: string;
                        scope: string;
                        access_type: string;
                        prompt: string;
                        callback: (response: TokenResponse) => void;
                    }): { requestAccessToken: () => void };
                    initCodeClient(config: {
                        client_id: string;
                        scope: string;
                        ux_mode: string;
                        callback: (response: { error?: string; code?: string }) => void;
                    }): { requestCode: () => void };
                };
            };
            picker: {
                DocsView: new () => GoogleDocsView;
                PickerBuilder: new () => GooglePickerBuilder;
                Action: {
                    PICKED: string;
                };
                Feature: {
                    MULTISELECT_ENABLED: string;
                    SUPPORT_DRIVES: string;
                };
            };
        };
        gapi: {
            load(api: string, callback: () => void): void;
        };
    }
}

interface GoogleDriveImporterProps {
    onUploadSuccess: (success: boolean) => void;
}

const TokenManager = {
    setCookie: (name: string, value: string, expiryHours: number = 24) => {
        const date = new Date();
        date.setTime(date.getTime() + (expiryHours * 60 * 60 * 1000));
        document.cookie = `${name}=${value}; path=/; expires=${date.toUTCString()}; SameSite=Strict; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
    },

    getCookie: (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        return parts.length === 2 ? parts.pop()?.split(';').shift() || null : null;
    },

    clearTokens: () => {
        ['googleDriveToken', 'googleDriveRefreshToken', 'tokenExpiryTime']
            .forEach(name => {
                document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
            });
    },

    refreshToken: async (refreshToken: string): Promise<string | null> => {
        try {
            const response = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            });

            if (response.data.access_token) {
                const expiryTime = Date.now() + (response.data.expires_in * 1000);
                TokenManager.setCookie('googleDriveToken', response.data.access_token, 24);
                TokenManager.setCookie('tokenExpiryTime', expiryTime.toString(), 24);
                return response.data.access_token;
            }
            return null;
        } catch {
            return null;
        }
    },

    getValidToken: async (): Promise<string | null> => {
        const currentToken = TokenManager.getCookie('googleDriveToken');
        const refreshToken = TokenManager.getCookie('googleDriveRefreshToken');
        const expiryTime = parseInt(TokenManager.getCookie('tokenExpiryTime') || '0');

        if (currentToken && expiryTime && Date.now() < expiryTime - 300000) {
            return currentToken;
        }

        if (refreshToken) {
            return await TokenManager.refreshToken(refreshToken);
        }

        return null;
    }
};

const GoogleDriveImporter: React.FC<GoogleDriveImporterProps> = ({ onUploadSuccess }) => {
    const { uploadingFiles, setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const uploadStatesRef = useRef<Record<string, StreamingState>>({});

    const calculateOverallProgress = (
        downloadProgress: number,
        uploadProgress: number,
        downloadWeight: number = 0.3,
        uploadWeight: number = 0.7
    ): number => (downloadProgress * downloadWeight + uploadProgress * uploadWeight);

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
        const fileId = uuidv4();

        const token = await TokenManager.getValidToken();
        if (!token) {
            throw new Error('Failed to get valid authentication token');
        }

        try {
            updateUploadStatus(file.name, {
                progress: 0,
                status: 'uploading'
            });

            const fileSize = parseInt(file.sizeBytes);
            if (fileSize <= SINGLE_PART_UPLOAD_LIMIT) {
                await singlePartUpload(file, fileId, token);
            } else {
                await multiPartUpload(file, fileId, token);
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
        }
    };

    const authenticate = useCallback(async () => {
        if (!window.google?.accounts?.oauth2) {
            toast.error('Failed to initialize Google authentication');
            return;
        }

        TokenManager.clearTokens();

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
                    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                        client_id: GOOGLE_CLIENT_ID,
                        client_secret: GOOGLE_CLIENT_SECRET,
                        code: response.code,
                        grant_type: 'authorization_code',
                        redirect_uri: window.location.origin
                    });

                    const { access_token, refresh_token, expires_in } = tokenResponse.data;

                    if (!access_token) {
                        throw new Error('Authentication failed');
                    }

                    const expiryTime = Date.now() + (expires_in * 1000);
                    TokenManager.setCookie('googleDriveToken', access_token, 24);
                    if (refresh_token) {
                        TokenManager.setCookie('googleDriveRefreshToken', refresh_token, 720);
                    }
                    TokenManager.setCookie('tokenExpiryTime', expiryTime.toString(), 24);

                    setIsAuthenticated(true);
                    showPicker(access_token);
                } catch {
                    toast.error('Authentication failed. Please try again.');
                }
            },
        });

        tokenClient.requestCode();
    }, []);

    const showPicker = useCallback(async (accessToken: string) => {
        if (!window.google?.picker || !accessToken) return;

        try {
            const response = await fetch(
                `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
            );

            if (!response.ok) {
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
            TokenManager.clearTokens();
            setIsAuthenticated(false);
        }
    }, [handlePickerCallback]);

    const handleDriveAction = useCallback(async () => {
        try {
            if (isUploading) {
                toast.error("Please wait for current uploads to complete before starting new uploads");
                return;
            }

            const validToken = await TokenManager.getValidToken();

            if (validToken) {
                try {
                    const response = await fetch(
                        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${validToken}`
                    );

                    if (response.ok) {
                        await showPicker(validToken);
                        return;
                    }

                    TokenManager.clearTokens();
                    setIsAuthenticated(false);
                } catch (error) {
                    TokenManager.clearTokens();
                    setIsAuthenticated(false);
                    throw new Error('Failed to verify authentication token');
                }
            }
            await authenticate();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Drive';
            toast.error(errorMessage);

            TokenManager.clearTokens();
            setIsAuthenticated(false);
        }
    }, [isUploading, authenticate, showPicker, isAuthenticated]);

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

                const token = await TokenManager.getValidToken();
                if (token) {
                    try {
                        const response = await fetch(
                            `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
                        );
                        if (response.ok) {
                            setIsAuthenticated(true);
                        } else {
                            TokenManager.clearTokens();
                            setIsAuthenticated(false);
                        }
                    } catch {
                        TokenManager.clearTokens();
                        setIsAuthenticated(false);
                    }
                }

                setIsInitialized(true);
            } catch (error) {
                toast.error('Failed to initialize Google Drive integration');
                TokenManager.clearTokens();
                setIsAuthenticated(false);
            }
        };

        loadGoogleAPIs();

        return () => {
            document.querySelectorAll('script[src*="google"]')
                .forEach(script => script.remove());
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (uploadingFiles.length > 0) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [uploadingFiles]);

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