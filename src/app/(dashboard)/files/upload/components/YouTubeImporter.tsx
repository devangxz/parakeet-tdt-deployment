'use client'

import axios from 'axios'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { getYoutubeMetadata } from '@/app/actions/youtube'
import { useUpload } from '@/app/context/UploadProvider'
import { UploaderProps } from '@/types/upload'
import { generateUniqueId } from '@/utils/generateUniqueId'

const YouTubeImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
  const { setUploadingFiles, updateUploadStatus, isUploading, setIsUploading } =
    useUpload()
  const { theme } = useTheme()
  const [urls, setUrls] = useState('')

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isUploading) {
      toast.error(
        'Please wait for current imports to complete before starting new uploads'
      )
      return
    }

    const youtubeUrls = urls
      .trim()
      .split('\n')
      .filter((url) => url.trim())

    if (youtubeUrls.length === 0) {
      toast.error('Please enter at least one valid YouTube URL')
      return
    }

    const initialFiles = youtubeUrls.map((url, index) => ({
      name: `Link-${index + 1}`,
      size: 0,
      fileId: generateUniqueId(),
      url: url.trim(),
    }))

    setIsUploading(true)
    setUploadingFiles(initialFiles)
    setUrls('')

    initialFiles.forEach((file) => {
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'processing',
      })
    })

    try {
      for (const file of initialFiles) {
        try {
          const metadataResponse = await getYoutubeMetadata(
            file.url,
            file.fileId
          )
          if (metadataResponse.success) {
            updateUploadStatus(file.name, {
              progress: 100,
              status: 'completed',
            })
            onUploadSuccess(true)
          } else {
            updateUploadStatus(file.name, {
              progress: 0,
              status: 'failed',
              error: `Validation failed - ${metadataResponse.message}`,
            })

            toast.error(
              `Error validating YouTube URL: ${file.url} - ${metadataResponse.message}`
            )
          }
        } catch (error) {
          const errorMessage = axios.isAxiosError(error)
            ? error.response?.data?.error
            : 'Invalid YouTube URL'

          updateUploadStatus(file.name, {
            progress: 0,
            status: 'failed',
            error: `Validation failed - ${errorMessage}`,
          })

          toast.error(
            `Error validating YouTube URL: ${file.url} - Please try again after some time`
          )
        }
      }
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error
        : error instanceof Error
        ? error.message
        : 'Import failed'
      toast.error(`Import failed: ${errorMessage}`)

      setUploadingFiles([])
      setIsUploading(false)
    } finally {
      setUploadingFiles([])
      setIsUploading(false)
    }
  }

  return (
    <div className='bg-background flex flex-col p-[12px] items-center justify-center rounded-md border-2 border-customBorder shadow-sm min-h-[245px]'>
      <div className='group relative w-full flex rounded-md text-center transition'>
        <div className='self-center w-full flex flex-col items-center justify-center gap-y-3'>
          <div className='flex items-center gap-1 text-base font-medium leading-6'>
            <div className='relative w-10 h-10 flex items-center justify-center'>
              <Image
                src={theme === 'dark' ? '/assets/images/upload/youtube-dark.svg' : '/assets/images/upload/youtube.svg'}
                alt='Link'
                width={40}
                height={40}
                className='object-contain'
                priority
              />
            </div>
            <h4 className='flex items-center'>YouTube Importer</h4>
          </div>
          <form onSubmit={handleImport} className='w-full flex flex-col gap-y-3'>
            <div className='w-full space-y-1'>
              <p className='ml-[2px] text-xs self-stretch leading-5 text-start text-muted-foreground'>
                Please enter the YouTube video URLs in the box below, one per
                line. Please note that the file must be publicly accessible to
                be imported.
              </p>
              <textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder='Enter YouTube URLs, one per line, e.g. https://www.youtube.com/watch?v=example'
                className='w-full px-4 py-2.5 rounded-md border border-customBorder bg-transparent placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-sm resize-none overflow-hidden'
                style={{
                  minHeight: '80px',
                  height: `${Math.max(80, urls.split('\n').length * 24)}px`,
                  overflowY: 'hidden',
                }}
              />
            </div>
            <div className='flex justify-center'>
              <button
                type='submit'
                className='px-5 py-2 bg-[#c4302b] rounded-[32px] text-white font-medium border border-[#c4302b] hover:bg-[#a32824] transition-colors'
              >
                Import
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default YouTubeImporter
