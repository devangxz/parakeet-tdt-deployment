'use client'

import { Box, CircularProgress } from '@mui/material'
import {
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  Video,
  Mic,
  FileVideo,
  File,
  FileText,
} from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'

import { useUpload } from '@/app/context/UploadProvider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'

interface UploadStatus {
  progress: number
  status:
    | 'validating'
    | 'uploading'
    | 'importing'
    | 'processing'
    | 'completed'
    | 'failed'
  error?: string
}

interface UploadFile {
  name: string
  size: number
}

const UploadProgressItem = ({
  file,
  status,
}: {
  file: UploadFile
  status: UploadStatus
}) => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''

  const getFileIcon = (ext: string) => {
    const commonProps = {
      size: 20,
      strokeWidth: 2,
    }

    const audioTypes = [
      'mp3',
      'wav',
      'wma',
      'aac',
      'flac',
      'ogg',
      'aif',
      'aiff',
      'amr',
      '3ga',
      'm4a',
      'opus',
    ]
    if (audioTypes.includes(ext.toLowerCase())) {
      return <Mic {...commonProps} className='text-blue-500' />
    }

    const videoTypes = [
      'mp4',
      'avi',
      'wmv',
      'mov',
      'webm',
      'flv',
      '3gp',
      'mpg',
      'mpeg',
      'm4v',
      'ogv',
    ]
    if (videoTypes.includes(ext.toLowerCase())) {
      return <Video {...commonProps} className='text-orange-500' />
    }

    const proVideoTypes = ['mxf', 'mts', 'mkv']
    if (proVideoTypes.includes(ext.toLowerCase())) {
      return <FileVideo {...commonProps} className='text-red-500' />
    }

    const docTypes = ['docx']
    if (docTypes.includes(ext.toLowerCase())) {
      return <FileText {...commonProps} className='text-emerald-500' />
    }

    return <File {...commonProps} className='text-gray-500' />
  }

  const renderStatusIcon = () => {
    switch (status.status) {
      case 'validating':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='flex items-center'>
                <CircularProgress
                  size={20}
                  sx={{
                    color: 'hsl(var(--primary))',
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Validating link...</p>
            </TooltipContent>
          </Tooltip>
        )
      case 'uploading':
      case 'importing':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant='determinate'
                  value={100}
                  thickness={7}
                  size={20}
                  sx={{
                    color: '#d3d3d3',
                    position: 'absolute',
                  }}
                />
                <CircularProgress
                  variant='determinate'
                  value={status.progress}
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
              <p>{Math.floor(status.progress)}% completed</p>
            </TooltipContent>
          </Tooltip>
        )
      case 'processing':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='flex items-center'>
                <CircularProgress
                  size={20}
                  sx={{
                    color: 'hsl(var(--primary))',
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Processing file...</p>
            </TooltipContent>
          </Tooltip>
        )
      case 'completed':
        return <CheckCircle size={20} className='text-green-500' />
      case 'failed':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <XCircle size={20} className='text-red-500' />
            </TooltipTrigger>
            <TooltipContent>
              <p>Operation failed</p>
            </TooltipContent>
          </Tooltip>
        )
    }
  }

  return (
    <div className='flex items-center py-2'>
      <TooltipProvider>
        <div className='mr-3'>{getFileIcon(fileExtension)}</div>
        <div className='flex items-center justify-between w-full'>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className='text-sm truncate max-w-[70%]'>
                {file.name.length > 20
                  ? `${file.name.substring(0, 20)}...`
                  : file.name}
              </h3>
            </TooltipTrigger>
            <TooltipContent>
              <p>{file.name}</p>
            </TooltipContent>
          </Tooltip>
          {renderStatusIcon()}
        </div>
      </TooltipProvider>
    </div>
  )
}

const UploadProgress = () => {
  const { uploadingFiles, uploadStatus } = useUpload()
  const [isExpanded, setIsExpanded] = useState(true)
  const [scrollAreaHeight, setScrollAreaHeight] = useState('auto')
  const [timeLeft, setTimeLeft] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const prevProgressRef = useRef(0)
  const speedEstimatesRef = useRef<number[]>([])
  const lastUpdateTimeRef = useRef(Date.now())
  const lastEstimateRef = useRef<number | null>(null)
  const activeUploadIdRef = useRef<string | null>(null)
  const hasActualSpeedRef = useRef(false)

  const formatTimeLeft = (seconds: number) => {
    seconds = Math.max(1, Math.round(seconds))
    if (seconds < 60) return `${Math.round(seconds)} sec left`
    if (seconds < 3600) {
      const minutes = Math.round(seconds / 60)
      return minutes === 60 ? '1 hr left' : `${minutes} min left`
    }
    let hours = Math.floor(seconds / 3600)
    let minutes = Math.round((seconds % 3600) / 60)
    if (minutes === 60) {
      hours += 1
      minutes = 0
    }
    return minutes === 0
      ? `${hours} hr left`
      : `${hours} hr ${minutes} min left`
  }

  // Reset upload tracking when files change
  useEffect(() => {
    if (uploadingFiles.length > 0) {
      // Generate a unique ID for this upload batch
      const newUploadId = Date.now().toString()

      // Check if this is a new upload batch
      if (activeUploadIdRef.current !== newUploadId) {
        // Reset all tracking refs
        speedEstimatesRef.current = []
        prevProgressRef.current = 0
        lastEstimateRef.current = null
        lastUpdateTimeRef.current = Date.now()
        activeUploadIdRef.current = newUploadId
        hasActualSpeedRef.current = false

        const isImporting = uploadingFiles.some(
          (file) => uploadStatus[file.name]?.status === 'importing'
        )
        setTimeLeft(isImporting ? 'Starting import...' : 'Starting upload...')
      }
    }
  }, [uploadingFiles])

  useEffect(() => {
    if (scrollAreaRef.current) {
      const contentHeight = scrollAreaRef.current.scrollHeight
      setScrollAreaHeight(Math.min(contentHeight, 200) + 'px')
    }

    if (uploadingFiles.length === 0) return

    const totalSize = uploadingFiles.reduce((acc, file) => acc + file.size, 0)
    const uploadedSize = uploadingFiles.reduce((acc, file) => {
      const progress = uploadStatus[file.name]?.progress || 0
      return acc + (file.size * progress) / 100
    }, 0)
    const overallProgress = (uploadedSize / totalSize) * 100

    // Check if any files are still uploading
    const hasUploadingFiles = uploadingFiles.some(
      (file) =>
        uploadStatus[file.name]?.status === 'uploading' ||
        uploadStatus[file.name]?.status === 'importing'
    )

    if (!hasUploadingFiles) {
      setTimeLeft('')
      return
    }

    const now = Date.now()
    const elapsedTime = (now - lastUpdateTimeRef.current) / 1000
    const uploadedDelta =
      uploadedSize - (prevProgressRef.current * totalSize) / 100

    if (elapsedTime > 0 && uploadedDelta > 0) {
      const currentSpeed = uploadedDelta / elapsedTime // bytes per second
      speedEstimatesRef.current.push(currentSpeed)
      hasActualSpeedRef.current = true

      // Keep only the last 10 speed estimates
      if (speedEstimatesRef.current.length > 10) {
        speedEstimatesRef.current.shift()
      }

      // Calculate the average speed
      const avgSpeed =
        speedEstimatesRef.current.reduce((a, b) => a + b, 0) /
        speedEstimatesRef.current.length

      const remainingSize = totalSize - uploadedSize
      let estimatedTimeLeft = remainingSize / avgSpeed

      // Apply some constraints to avoid unrealistic estimates
      estimatedTimeLeft = Math.max(1, estimatedTimeLeft)
      estimatedTimeLeft = Math.min(estimatedTimeLeft, 24 * 60 * 60)

      // Update the time estimate if it's reasonable
      if (
        lastEstimateRef.current === null ||
        (estimatedTimeLeft < lastEstimateRef.current && estimatedTimeLeft >= 1)
      ) {
        lastEstimateRef.current = estimatedTimeLeft
        setTimeLeft(formatTimeLeft(estimatedTimeLeft))
      }
    } else if (!hasActualSpeedRef.current) {
      const isImporting = uploadingFiles.some(
        (file) => uploadStatus[file.name]?.status === 'importing'
      )
      setTimeLeft(isImporting ? 'Starting import...' : 'Starting upload...')
    }

    prevProgressRef.current = overallProgress
    lastUpdateTimeRef.current = now

    // Only show "1 sec left" if we're actually at the very end
    if (overallProgress >= 99.9 && hasUploadingFiles) {
      setTimeLeft('1 sec left')
    }
  }, [uploadingFiles, uploadStatus])

  const fileCountsByStatus = uploadingFiles.reduce((counts, file) => {
    const status = uploadStatus[file.name]?.status || 'uploading'
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  const inProgressFiles =
    (fileCountsByStatus['uploading'] ?? 0) +
    (fileCountsByStatus['importing'] ?? 0)
  const failedFiles = fileCountsByStatus['failed'] || 0
  const completedFiles = fileCountsByStatus['completed'] || 0
  const totalFiles = uploadingFiles.length

  const pluralize = (count: number, singular: string, plural: string) =>
    count === 1 ? singular : plural

  const getHeaderContent = () => {
    const validatingFiles = uploadingFiles.filter(
      (file) => uploadStatus[file.name]?.status === 'validating'
    ).length
    if (validatingFiles > 0) {
      return {
        title:
          validatingFiles === 1
            ? 'Validating 1 link'
            : `Validating ${validatingFiles} links`,
        subtitle: 'Checking file accessibility...',
      }
    }

    if (inProgressFiles > 0) {
      const isImporting = uploadingFiles.some(
        (file) => uploadStatus[file.name]?.status === 'importing'
      )
      const status = isImporting ? 'Importing' : 'Uploading'
      return {
        title:
          inProgressFiles === 1
            ? `${status} 1 file`
            : `${status} ${inProgressFiles} files`,
        subtitle:
          timeLeft ||
          (isImporting ? 'Starting import...' : 'Starting upload...'),
      }
    }

    const processingFiles = uploadingFiles.filter(
      (file) => uploadStatus[file.name]?.status === 'processing'
    ).length
    if (processingFiles > 0) {
      return {
        title:
          processingFiles === 1
            ? 'Processing 1 file'
            : `Processing ${processingFiles} files`,
        subtitle: 'This might take a moment...',
      }
    }

    const allProcessed = completedFiles + failedFiles === totalFiles
    if (allProcessed) {
      const details: string[] = []
      if (completedFiles > 0) {
        details.push(
          `${completedFiles} ${pluralize(
            completedFiles,
            'file',
            'files'
          )} complete`
        )
      }
      if (failedFiles > 0) {
        details.push(
          `${failedFiles} ${pluralize(failedFiles, 'file', 'files')} failed`
        )
      }

      return {
        title:
          failedFiles === totalFiles
            ? 'Operation failed'
            : completedFiles === totalFiles
            ? 'Operation complete'
            : 'Operation finished',
        subtitle: details.join(', '),
      }
    }

    return {
      title: 'Operation complete',
      subtitle: '',
    }
  }

  if (uploadingFiles.length === 0) {
    return null
  }

  return (
    <div
      style={{ right: '20px' }}
      className='fixed bottom-0 w-80 bg-white rounded-t-xl shadow-lg overflow-hidden z-50 border border-gray-200'
    >
      <div className='p-3 bg-primary/10 flex justify-between items-center'>
        <div className='flex-1'>
          <h3 className='font-medium text-primary'>
            {getHeaderContent().title}
          </h3>
          {getHeaderContent().subtitle && (
            <p className='text-xs text-gray-500 mt-1'>
              {getHeaderContent().subtitle}
            </p>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown
            onClick={() => setIsExpanded(false)}
            size={25}
            className='cursor-pointer p-1 rounded-full hover:bg-gray-200 transition-colors duration-200'
          />
        ) : (
          <ChevronUp
            onClick={() => setIsExpanded(true)}
            size={25}
            className='cursor-pointer p-1 rounded-full hover:bg-gray-200 transition-colors duration-200'
          />
        )}
      </div>
      <div
        className='transition-all duration-300 ease-in-out overflow-hidden'
        style={{ maxHeight: isExpanded ? scrollAreaHeight : '0px' }}
      >
        <ScrollArea style={{ height: scrollAreaHeight, maxHeight: '200px' }}>
          <div ref={scrollAreaRef} className='px-3 bg-white'>
            {uploadingFiles.map((file) => (
              <UploadProgressItem
                key={file.name}
                file={file}
                status={
                  uploadStatus[file.name] || {
                    progress: 0,
                    status: 'uploading',
                  }
                }
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export default UploadProgress
