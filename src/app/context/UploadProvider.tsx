'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

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

    useEffect(() => {
        const storedFiles = localStorage.getItem('uploadingFiles');
        const storedProgress = localStorage.getItem('uploadProgress');
        if (storedFiles) setUploadingFiles(JSON.parse(storedFiles));
        if (storedProgress) setUploadProgress(JSON.parse(storedProgress));
    }, []);

    useEffect(() => {
        localStorage.setItem('uploadingFiles', JSON.stringify(uploadingFiles));
        localStorage.setItem('uploadProgress', JSON.stringify(uploadProgress));
    }, [uploadingFiles, uploadProgress]);

    const updateUploadProgress = (fileName: string, progress: number) => {
        setUploadProgress(prev => ({
            ...prev,
            [fileName]: progress
        }));
    };

    const clearUpload = () => {
        setUploadingFiles([]);
        setUploadProgress({});
        localStorage.removeItem('uploadingFiles');
        localStorage.removeItem('uploadProgress');
    };

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