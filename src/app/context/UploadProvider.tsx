'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface UploadFile {
    name: string;
    size: number;
}

interface UploadStatus {
    progress: number;
    status: 'uploading' | 'completed' | 'failed';
    error?: string;
}

interface UploadContextType {
    uploadingFiles: UploadFile[];
    setUploadingFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
    uploadStatus: Record<string, UploadStatus>;
    updateUploadStatus: (fileName: string, status: Partial<UploadStatus>) => void;
    clearUpload: () => void;
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

    const latestStatusRef = useRef<Record<string, UploadStatus>>({});

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

    const clearUpload = useCallback(() => {
        setUploadingFiles([]);
        setUploadStatus({});
        latestStatusRef.current = {};
    }, []);

    useEffect(() => {
        if (uploadingFiles.length > 0) {
            const allFilesProcessed = uploadingFiles.every(file => {
                const status = uploadStatus[file.name]?.status;
                return status === 'completed' || status === 'failed';
            });

            if (allFilesProcessed) {
                // Clear upload state after a delay to show completion status
                setTimeout(clearUpload, 3000);
            }
        }
    }, [uploadingFiles, uploadStatus, clearUpload]);

    const contextValue = {
        uploadingFiles,
        setUploadingFiles,
        uploadStatus,
        updateUploadStatus,
        clearUpload
    };

    return (
        <UploadContext.Provider value={contextValue}>
            {children}
        </UploadContext.Provider>
    );
};

export default UploadProvider;