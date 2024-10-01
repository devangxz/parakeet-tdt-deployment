'use client'

import { LinearProgress } from '@mui/material';
import React from 'react';

import { useUpload } from '@/app/context/UploadProvider';

const UploadProgressItem = ({ file, progress, speed, timeLeft }) => (
    <div className="mb-3 last:mb-0">
        <div className="flex justify-between items-center mb-1">
            <span className="font-medium truncate text-sm" style={{ maxWidth: '70%' }}>{file.name}</span>
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
        </div>
        <LinearProgress variant="determinate" value={progress} className="w-full" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{speed}/s</span>
            <span>{timeLeft}</span>
        </div>
    </div>
);

const UploadProgress = () => {
    const { uploadingFiles, uploadProgress } = useUpload();

    const calculateSpeed = (file, progress) => `${((file.size * progress / 100 / 1024) / 1024).toFixed(2)} MB`;

    const calculateTimeLeft = (file, progress) => {
        const remainingSeconds = (100 - progress) / 10;
        const hours = Math.floor(remainingSeconds / 3600);
        const minutes = Math.floor((remainingSeconds % 3600) / 60);
        const seconds = Math.round(remainingSeconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    };

    const overallProgress = uploadingFiles.length > 0
        ? uploadingFiles.reduce((sum, file) => sum + (uploadProgress[file.name] || 0), 0) / uploadingFiles.length
        : 0;

    if (uploadingFiles.length === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-0 right-0 w-80 bg-white rounded-lg shadow-lg overflow-hidden z-50 border border-gray-200">
            <div className="p-3 bg-gray-50 border-b flex items-center">
                <h3 className="text-sm font-semibold text-gray-700">Upload Progress</h3>
            </div>
            <div className="p-3">
                <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                        <span className="text-xs text-gray-500">{Math.round(overallProgress)}%</span>
                    </div>
                    <LinearProgress variant="determinate" value={overallProgress} className="w-full" />
                </div>
                <div className="max-h-48 overflow-y-auto">
                    {uploadingFiles.map(file => (
                        <UploadProgressItem
                            key={file.name}
                            file={file}
                            progress={uploadProgress[file.name] || 0}
                            speed={calculateSpeed(file, uploadProgress[file.name] || 0)}
                            timeLeft={calculateTimeLeft(file, uploadProgress[file.name] || 0)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UploadProgress;