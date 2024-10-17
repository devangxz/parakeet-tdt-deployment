'use client'

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface UploadFile {
    name: string;
    size: number;
}

interface UploadContextType {
    uploadingFiles: UploadFile[];
    setUploadingFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
    uploadProgress: Record<string, number>;
    updateUploadProgress: (fileName: string, progress: number) => void;
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
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const latestProgressRef = useRef<Record<string, number>>({});

    const debouncedSetUploadProgress = useCallback(
        debounce(() => {
            setUploadProgress(prevProgress => ({
                ...prevProgress,
                ...latestProgressRef.current
            }));
        }, 100),
        []
    );

    const updateUploadProgress = useCallback((fileName: string, progress: number) => {
        latestProgressRef.current[fileName] = progress;
        debouncedSetUploadProgress();
    }, [debouncedSetUploadProgress]);

    const clearUpload = useCallback(() => {
        setUploadingFiles([]);
        setUploadProgress({});
        latestProgressRef.current = {};
        sessionStorage.removeItem('uploadingFiles');
        sessionStorage.removeItem('uploadProgress');
    }, []);

    useEffect(() => {
        const storedFiles = sessionStorage.getItem('uploadingFiles');
        const storedProgress = sessionStorage.getItem('uploadProgress');

        if (storedFiles && storedProgress) {
            setUploadingFiles(JSON.parse(storedFiles));
            setUploadProgress(JSON.parse(storedProgress));
            latestProgressRef.current = JSON.parse(storedProgress);
        }
    }, []);

    useEffect(() => {
        if (uploadingFiles.length > 0) {
            sessionStorage.setItem('uploadingFiles', JSON.stringify(uploadingFiles));
            sessionStorage.setItem('uploadProgress', JSON.stringify(uploadProgress));
        }
    }, [uploadingFiles, uploadProgress]);

    return (
        <UploadContext.Provider value={{
            uploadingFiles,
            setUploadingFiles,
            uploadProgress,
            updateUploadProgress,
            clearUpload
        }}>
            {children}
        </UploadContext.Provider>
    );
};

export default UploadProvider;