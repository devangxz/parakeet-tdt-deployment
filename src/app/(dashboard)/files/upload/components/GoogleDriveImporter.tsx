'use client';

import { ReloadIcon } from '@radix-ui/react-icons';
import axios from 'axios';
import Image from 'next/image';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { useImportService } from '@/app/context/ImportServiceProvider';
import { useUpload } from '@/app/context/UploadProvider';
import { MAX_FILE_SIZE, SINGLE_PART_UPLOAD_LIMIT, MULTI_PART_UPLOAD_CHUNK_SIZE, UPLOAD_MAX_RETRIES } from '@/constants';
import { StreamingState, GoogleDriveFile, GooglePickerResponse, UploaderProps } from '@/types/upload';
import { generateUniqueId } from '@/utils/generateUniqueId';
import { handleRetryableError, calculateOverallProgress, refreshToken } from '@/utils/uploadUtils';
import { getAllowedMimeTypes } from '@/utils/validateFileType';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!;

const GoogleDriveImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
    const { setUploadingFiles, updateUploadStatus, initializeSSEConnection, isUploading, setIsUploading } = useUpload();
    const { isGoogleDriveServiceReady } = useImportService();
    const [isPickerLoading, setIsPickerLoading] = useState(false);

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
                        status: 'importing'
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
        file: GoogleDriveFile,
        fileId: string
    ): Promise<StreamingState> => {
        let retryCount = -1;

        const checkRes = await axios.post('/api/s3-upload/multi-part/check-session', {
            fileName: file.name,
            fileSize: file.sizeBytes,
            sourceType: 'google-drive',
            sourceId: file.id
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
                totalSize: parseInt(file.sizeBytes)
            };
        }

        while (retryCount <= UPLOAD_MAX_RETRIES) {
            try {
                const createRes = await axios.post('/api/s3-upload/multi-part/create', {
                    fileInfo: {
                        type: file.mimeType,
                        originalName: file.name,
                        fileId,
                        size: file.sizeBytes,
                        source: 'google-drive',
                        sourceId: file.id
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

    const multiPartUpload = async (file: GoogleDriveFile, fileId: string, token: string): Promise<void> => {
        let state = await initializeMultiPartUpload(file, fileId);

        try {
            let retryCount = -1;
            while (true) {
                try {
                    const headers: Record<string, string> = {
                        'Authorization': `Bearer ${token}`
                    };

                    if (state.downloadedBytes > 0) {
                        headers['Range'] = `bytes=${state.downloadedBytes}-`;
                    }

                    const downloadResponse = await fetch(
                        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                        {
                            headers,
                            signal: state.abortController.signal
                        }
                    );
                    if (!downloadResponse.ok || !downloadResponse.body) {
                        throw new Error('Failed to get file stream from Google Drive');
                    }

                    if (state.completedParts.length > 0) {
                        updateUploadStatus(file.name, {
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
                                status: 'importing'
                            });

                            if (state.bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
                                state = await uploadBufferedPart(state, file.name);
                            }
                        }
                    }

                    break;
                } catch (error) {
                    retryCount++;
                    if (retryCount >= UPLOAD_MAX_RETRIES) {
                        throw new Error(`File upload failed after ${UPLOAD_MAX_RETRIES} attempts`);
                    }

                    let tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
                    if (!tokenResponse.data.token) {
                        const refreshSuccess = await refreshToken('google-drive');
                        if (refreshSuccess) {
                            tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
                        } else {
                            throw new Error('Failed to get valid authentication token');
                        }
                    }
                    if (tokenResponse.data.token) {
                        token = tokenResponse.data.token;
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

    const uploadFile = async (file: GoogleDriveFile): Promise<void> => {
        updateUploadStatus(file.name, {
            progress: 0,
            status: 'importing'
        });

        const fileId = generateUniqueId();

        try {
            let tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
            if (!tokenResponse.data.token) {
                const refreshSuccess = await refreshToken('google-drive');
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
            toast.error(`Import failed for ${file.name}. Please note that if you try importing the same file again after a few minutes, it will automatically resume from where it stopped.`);
        }
    };

    const handlePickerCallback = async (data: GooglePickerResponse) => {
        if (data.action !== window.google.picker.Action.PICKED) return;

        if (isUploading) {
            toast.error("Please wait for current uploads to complete before starting new uploads");
            return;
        }

        const selectedFiles = data.docs;

        const filesUnderSizeLimit = selectedFiles.filter((file: GoogleDriveFile) => {
            const size = parseInt(file.sizeBytes);
            if (size > MAX_FILE_SIZE) {
                toast.error(`File "${file.name}" was rejected due to exceeding 10GB size limit.`);
                return false;
            }
            return true;
        });
        if (filesUnderSizeLimit.length === 0) {
            if (selectedFiles.length > 1) {
                toast.error("No valid files selected. Please select supported audio or video files under 10GB in size");
            }
            return;
        }

        setIsUploading(true);
        setUploadingFiles(filesUnderSizeLimit.map((file: GoogleDriveFile) => ({
            name: file.name,
            size: parseInt(file.sizeBytes),
            fileId: file.id
        })));

        try {
            initializeSSEConnection(
                () => onUploadSuccess(true),
                () => setIsUploading(false)
            );

            for (const file of filesUnderSizeLimit) {
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
        }
    }, [handlePickerCallback]);

    const getTokenAndShowPicker = async () => {
        try {
            let tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
            if (!tokenResponse.data.token) {
                const refreshSuccess = await refreshToken('google-drive');
                if (refreshSuccess) {
                    tokenResponse = await axios.get('/api/s3-upload/google-drive/token');
                } else {
                    throw new Error('Failed to get valid token');
                }
            }

            await showPicker(tokenResponse.data.token);
        } catch (error) {
            toast.error('Failed to get access token. Please try authenticating again.');
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
                    setIsPickerLoading(true);

                    const result = await axios.post('/api/s3-upload/google-drive/auth', {
                        code: response.code
                    });

                    if (result.data.success) {
                        await getTokenAndShowPicker();
                    } else {
                        throw new Error('Authentication failed');
                    }
                } catch {
                    setIsPickerLoading(false);
                    toast.error('Authentication failed. Please try again.');
                } finally {
                    setIsPickerLoading(false);
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

            setIsPickerLoading(true);

            const validationResponse = await axios.get('/api/s3-upload/google-drive/token/validate');
            if (validationResponse.data.isValid) {
                await getTokenAndShowPicker();
                setIsPickerLoading(false);
                return;
            }
            if (validationResponse.data.needsRefresh) {
                const refreshSuccess = await refreshToken('google-drive');
                if (refreshSuccess) {
                    await getTokenAndShowPicker();
                    setIsPickerLoading(false);
                    return;
                }
            }

            await authenticate();
        } catch (error) {
            setIsPickerLoading(false);

            const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Google Drive';
            toast.error(errorMessage);
        } finally {
            setIsPickerLoading(false);
        }
    }, [isUploading, authenticate, showPicker]);

    return (
        <div className='bg-white flex flex-col p-[12px] items-center justify-center rounded-[12px] border-2 border-primary shadow-sm'>
            <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
                <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
                    <div className='flex items-center gap-1 text-base font-medium leading-6 text-gray-800'>
                        <div className="relative w-10 h-10 flex items-center justify-center">
                            <Image
                                src="/assets/images/upload/google-drive.svg"
                                alt="Google Drive"
                                width={40}
                                height={40}
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h4 className="flex items-center">Google Drive Importer</h4>
                    </div>
                    <div className='text-xs self-stretch mt-4 leading-5 text-center text-gray-800 max-md:mr-1 max-md:max-w-full'>
                        Select files from your Google Drive to import. Please allow Scribie.ai Importer in the popup to access your Google Drive files for the import process. We will only access the selected files. The permissions can be revoked from your{' '}
                        <a
                            href="https://security.google.com/settings/security/permissions"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                        >
                            Google Account Settings
                        </a>
                        {' '}page anytime.
                    </div>
                    <button
                        onClick={handleDriveAction}
                        disabled={!isGoogleDriveServiceReady || isPickerLoading}
                        className='mt-4 px-5 py-2 bg-[#00ac47] rounded-[32px] text-white font-medium border border-[#00ac47] hover:bg-[#009940] transition-colors'
                    >
                        <div className='flex items-center justify-center'>
                            {(!isGoogleDriveServiceReady || isPickerLoading) && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
                            <span>{!isGoogleDriveServiceReady ? 'Initializing...' : 'Select from Google Drive'}</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoogleDriveImporter;