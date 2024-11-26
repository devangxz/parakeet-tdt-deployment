'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

import { SSE_MAX_RETRIES, SSE_RETRY_DELAY } from '@/constants';

interface UploadFile {
    name: string;
    size: number;
    fileId: string;
}

interface UploadStatus {
    progress: number;
    status: 'validating' | 'uploading' | 'processing' | 'completed' | 'failed';
    error?: string;
}

interface UploadContextType {
    uploadingFiles: UploadFile[];
    setUploadingFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
    uploadStatus: Record<string, UploadStatus>;
    updateUploadStatus: (fileName: string, status: Partial<UploadStatus>) => void;
    clearUpload: () => void;
    initializeSSEConnection: (onFileSuccess: () => void, onAllCompleted: () => void) => void;
    closeSSEConnection: () => void;
    isUploading: boolean;
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
}

function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

const UploadContext = createContext<UploadContextType | null>(null);

export const useUpload = () => {
    const context = useContext(UploadContext);
    if (!context) {
        throw new Error('useUpload must be used within an UploadProvider');
    }
    return context;
};

const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);
    const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>({});
    const [isUploading, setIsUploading] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);
    const latestStatusRef = useRef<Record<string, UploadStatus>>({});
    const errorCountRef = useRef(0);
    const isConnectionActive = useRef(false);
    const callbacksRef = useRef<{
        onFileSuccess: () => void;
        onAllCompleted: () => void;
    }>({
        onFileSuccess: () => { },
        onAllCompleted: () => { },
    });

    const debouncedSetUploadStatus = useCallback(
        debounce(() => {
            setUploadStatus(prevStatus => ({
                ...prevStatus,
                ...latestStatusRef.current
            }));
        }, 100),
        []
    );

    const updateUploadStatus = useCallback((fileName: string, status: Partial<UploadStatus>) => {
        latestStatusRef.current[fileName] = {
            ...latestStatusRef.current[fileName],
            ...status
        };
        debouncedSetUploadStatus();
    }, [debouncedSetUploadStatus]);

    const closeSSEConnection = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
            isConnectionActive.current = false;
            errorCountRef.current = 0;
        }
    }, []);

    const initializeSSEConnection = useCallback((onFileSuccess: () => void, onAllCompleted: () => void) => {
        callbacksRef.current = {
            onFileSuccess,
            onAllCompleted,
        };

        closeSSEConnection();

        errorCountRef.current = 0;

        try {
            eventSourceRef.current = new EventSource('/api/sse');
            isConnectionActive.current = true;

            eventSourceRef.current.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                if (data?.type === 'METADATA_EXTRACTION') {
                    if (data?.file?.status === 'success') {
                        updateUploadStatus(data?.file?.fileNameWithExtension, {
                            progress: 100,
                            status: 'completed'
                        });
                        callbacksRef.current.onFileSuccess();
                    } else {
                        updateUploadStatus(data?.file?.fileNameWithExtension, {
                            progress: 0,
                            status: 'failed',
                            error: 'Metadata extraction failed.'
                        });
                    }
                }
            };

            eventSourceRef.current.onopen = () => {
                errorCountRef.current = 0;
            };

            eventSourceRef.current.onerror = () => {
                errorCountRef.current++;

                if (uploadingFiles.length > 0 && errorCountRef.current < SSE_MAX_RETRIES) {
                    setTimeout(() => {
                        if (eventSourceRef.current) {
                            closeSSEConnection();
                            initializeSSEConnection(onFileSuccess, onAllCompleted);
                        }
                    }, SSE_RETRY_DELAY * Math.pow(2, errorCountRef.current - 1));
                } else {
                    closeSSEConnection();
                }
            };
        } catch (error) {
            closeSSEConnection();
        }
    }, [uploadingFiles.length, updateUploadStatus, closeSSEConnection]);

    const clearUpload = useCallback(() => {
        setUploadingFiles([]);
        setUploadStatus({});
        latestStatusRef.current = {};
        closeSSEConnection();
        setIsUploading(false);
    }, [closeSSEConnection]);

    useEffect(() => {
        if (uploadingFiles.length > 0) {
            const allFilesProcessed = uploadingFiles.every(file => {
                const status = uploadStatus[file.name]?.status;
                return status === 'completed' || status === 'failed';
            });

            if (allFilesProcessed) {
                callbacksRef.current.onFileSuccess();
                callbacksRef.current.onAllCompleted();
                setTimeout(() => {
                    clearUpload();
                }, 2000);
            }
        }
    }, [uploadingFiles, uploadStatus, clearUpload]);

    useEffect(() => () => {
        closeSSEConnection();
    }, [closeSSEConnection]);

    useEffect(() => {
        if (uploadingFiles.length === 0) return;

        const checkConnection = () => {
            if (isConnectionActive.current && !eventSourceRef.current) {
                closeSSEConnection();
            }

            if (isConnectionActive.current && eventSourceRef.current?.readyState === EventSource.CLOSED) {
                closeSSEConnection();
            }
        };

        const intervalId = setInterval(checkConnection, 5000);

        return () => {
            clearInterval(intervalId);

            if (isConnectionActive.current) {
                closeSSEConnection();
            }
        };
    }, [uploadingFiles.length, closeSSEConnection]);

    useEffect(() => {
        const handleBeforeAction = (event: BeforeUnloadEvent) => {
            if (uploadingFiles.length > 0) {
                event.preventDefault();
                event.returnValue = '';
                return 'You have uploads in progress. Are you sure you want to leave?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeAction);

        window.onbeforeunload = handleBeforeAction;

        return () => {
            window.removeEventListener('beforeunload', handleBeforeAction);
            window.onbeforeunload = null;
        };
    }, [uploadingFiles]);

    const contextValue = {
        uploadingFiles,
        setUploadingFiles,
        uploadStatus,
        updateUploadStatus,
        clearUpload,
        initializeSSEConnection,
        closeSSEConnection,
        isUploading,
        setIsUploading
    };

    return (
        <UploadContext.Provider value={contextValue}>
            {children}
        </UploadContext.Provider>
    );
};

export default UploadProvider;