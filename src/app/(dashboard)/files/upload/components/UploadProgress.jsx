'use client'

import { Box, CircularProgress } from '@mui/material';
import { ChevronUp, ChevronDown, CheckCircle } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { useUpload } from '@/app/context/UploadProvider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const UploadProgressItem = ({ file, progress }) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    const getFileIcon = (ext) => {
        switch (ext.toLowerCase()) {
            // Audio files
            case 'mp3':
            case 'wav':
            case 'aac':
            case 'ogg':
            case 'flac':
            case 'wma':
                return '🎵';

            // Video files
            case 'mp4':
            case 'avi':
            case 'wmv':
            case 'mov':
            case 'webm':
            case 'mkv':
            case 'flv':
            case '3gp':
                return '🎬';

            // Special cases
            case 'm4a':
                return '🎙️'; // Audio recording icon
            case 'm4v':
                return '📹'; // Video camera icon
            case 'mxf':
                return '🎞️'; // Film frames icon
            case 'opus':
                return '🔊'; // Speaker icon
            case 'docx':
                return '📄'; // Document icon

            // Default case
            default:
                return '📁'; // Folder icon for unknown types
        }
    };

    const isCompleted = progress === 100;

    return (
        <div className="flex items-center py-2">
            <div className="mr-3">{getFileIcon(fileExtension)}</div>
            <div className='flex items-center justify-between w-full'>
                <h3 className="text-sm truncate max-w-[70%]" title={file.name}>
                    {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                </h3>
                {isCompleted ? (
                    <CheckCircle size={20} className="text-green-500" />
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                    <CircularProgress
                                        variant="determinate"
                                        value={100}
                                        thickness={7}
                                        size={20}
                                        sx={{
                                            color: '#d3d3d3',
                                            position: 'absolute',
                                        }}
                                    />
                                    <CircularProgress
                                        variant="determinate"
                                        value={progress}
                                        thickness={7}
                                        size={20}
                                        sx={{
                                            color: 'hsl(var(--primary))',
                                            '& .MuiCircularProgress-circle': {
                                                strokeLinecap: 'round',
                                            },
                                        }}
                                    />
                                </Box>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{Math.floor(progress)}% completed</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
};

const UploadProgress = () => {
    const { uploadingFiles, uploadProgress } = useUpload();
    const [isExpanded, setIsExpanded] = useState(true);
    const [scrollAreaHeight, setScrollAreaHeight] = useState('auto');
    const [timeLeft, setTimeLeft] = useState('');
    const scrollAreaRef = useRef(null);
    const prevProgressRef = useRef(0);
    const speedEstimatesRef = useRef([]);
    const lastUpdateTimeRef = useRef(Date.now());
    const lastEstimateRef = useRef(null);

    const formatTimeLeft = (seconds) => {
        if (seconds < 60) return `${Math.round(seconds)} sec left`;
        if (seconds < 3600) {
            const minutes = Math.round(seconds / 60);
            return minutes === 60 ? '1 hr left' : `${minutes} min left`;
        }
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.round((seconds % 3600) / 60);
        if (minutes === 60) {
            hours += 1;
            minutes = 0;
        }
        return minutes === 0 ? `${hours} hr left` : `${hours} hr ${minutes} min left`;
    };

    useEffect(() => {
        if (scrollAreaRef.current) {
            const contentHeight = scrollAreaRef.current.scrollHeight;
            setScrollAreaHeight(Math.min(contentHeight, 200) + 'px');
        }

        const totalSize = uploadingFiles.reduce((acc, file) => acc + file.size, 0);
        const uploadedSize = uploadingFiles.reduce((acc, file) => {
            const progress = uploadProgress[file.name] || 0;
            return acc + (file.size * progress / 100);
        }, 0);
        const overallProgress = (uploadedSize / totalSize) * 100;

        const now = Date.now();
        const elapsedTime = (now - lastUpdateTimeRef.current) / 1000; // in seconds
        const uploadedDelta = uploadedSize - (prevProgressRef.current * totalSize / 100);

        if (elapsedTime > 0 && uploadedDelta > 0) {
            const currentSpeed = uploadedDelta / elapsedTime; // bytes per second
            speedEstimatesRef.current.push(currentSpeed);

            // Keep only the last 10 speed estimates
            if (speedEstimatesRef.current.length > 10) {
                speedEstimatesRef.current.shift();
            }

            // Calculate the average speed
            const avgSpeed = speedEstimatesRef.current.reduce((a, b) => a + b, 0) / speedEstimatesRef.current.length;

            const remainingSize = totalSize - uploadedSize;
            let estimatedTimeLeft = remainingSize / avgSpeed;

            // Apply some constraints to avoid unrealistic estimates
            estimatedTimeLeft = Math.max(estimatedTimeLeft, 1); // At least 1 second left
            estimatedTimeLeft = Math.min(estimatedTimeLeft, 24 * 60 * 60); // Max 24 hours

            // Only update if the new estimate is less than the previous one
            if (lastEstimateRef.current === null || estimatedTimeLeft < lastEstimateRef.current) {
                lastEstimateRef.current = estimatedTimeLeft;
                setTimeLeft(formatTimeLeft(estimatedTimeLeft));
            }
        } else if (speedEstimatesRef.current.length === 0) {
            // Initial estimate based on total size (assuming 500 KB/s as starting speed)
            const initialEstimate = totalSize / (500 * 1024); // seconds
            lastEstimateRef.current = initialEstimate;
            setTimeLeft(formatTimeLeft(initialEstimate));
        }

        prevProgressRef.current = overallProgress;
        lastUpdateTimeRef.current = now;

        // Check if upload is complete
        if (overallProgress >= 99.9) {
            setTimeLeft('1 sec left');
        }

    }, [uploadingFiles, uploadProgress]);

    if (uploadingFiles.length === 0) {
        return null;
    }

    const totalFiles = uploadingFiles.length;
    const completedFiles = uploadingFiles.filter(file => uploadProgress[file.name] === 100).length;
    const inProgressFiles = totalFiles - completedFiles;

    return (
        <div style={{ right: '20px' }} className="fixed bottom-0 w-80 bg-white rounded-t-xl shadow-lg overflow-hidden z-50 border border-gray-200">
            <div className="p-3 bg-primary/10 flex justify-between items-center">
                <div>
                    <h3 className="font-medium text-primary">
                        Uploading {inProgressFiles === 1 ? '1 item' : `${inProgressFiles} items`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{timeLeft}</p>
                </div>
                {isExpanded ?
                    <ChevronDown onClick={() => setIsExpanded(!isExpanded)} size={25} className='cursor-pointer p-1 rounded-full hover:bg-gray-200 transition-colors duration-200' /> :
                    <ChevronUp onClick={() => setIsExpanded(!isExpanded)} size={25} className='cursor-pointer p-1 rounded-full hover:bg-gray-200 transition-colors duration-200' />
                }
            </div>
            <div
                className="transition-all duration-300 ease-in-out overflow-hidden"
                style={{ maxHeight: isExpanded ? scrollAreaHeight : '0px' }}
            >
                <ScrollArea style={{ height: scrollAreaHeight, maxHeight: '200px' }}>
                    <div ref={scrollAreaRef} className="px-3 bg-white">
                        {uploadingFiles.map(file => (
                            <UploadProgressItem
                                key={file.name}
                                file={file}
                                progress={uploadProgress[file.name] || 0}
                            />
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};

export default UploadProgress;