'use client'

import { UploadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { FileUp, FolderUp } from 'lucide-react'
import { useSession } from 'next-auth/react'
import React, { useState, useCallback, ChangeEvent } from 'react'
import Dropzone from 'react-dropzone'
import { toast } from 'sonner'

import { FILE_TYPES } from '@/constants'
import { cn } from '@/lib/utils'

interface CustomInputAttributes
  extends React.InputHTMLAttributes<HTMLInputElement> {
  directory?: string
  webkitdirectory?: string
}

interface FileAndFolderUploaderProps {
  onUploadSuccess: (success: boolean) => void
}

const FileAndFolderUploader: React.FC<FileAndFolderUploaderProps> = ({ onUploadSuccess }) => {
  const { data: session } = useSession()
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileOrFolderUpload = async (files: File[], isFolder: boolean) => {
    if (files.length === 0) return

    setUploadProgress(0)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const createRes = await axios.post('/api/s3-multipart-upload/create', {
          fileInfo: {
            name: isFolder ? `${file.webkitRelativePath}` : file.name,
            type: file.type
          }
        })
        const { uploadId, key } = createRes.data

        const chunkSize = 100 * 1024 * 1024 // 100MB chunks
        const numChunks = Math.ceil(file.size / chunkSize)
        const uploadPromises = []

        for (let j = 0; j < numChunks; j++) {
          const start = j * chunkSize
          const end = Math.min(start + chunkSize, file.size)
          const blob = file.slice(start, end)

          const partRes = await axios.post('/api/s3-multipart-upload/part', {
            sendBackData: { key, uploadId },
            partNumber: j + 1,
            contentLength: blob.size,
          })

          const uploadPromise = axios.put(partRes.data.url, blob, {
            headers: { 'Content-Type': file.type },
            onUploadProgress: (progressEvent) => {
              const fileProgress = ((j * chunkSize + progressEvent.loaded) / file.size)
              const overallProgress = ((i + fileProgress) / files.length) * 100
              setUploadProgress(Math.round(overallProgress))
            },
          })
          uploadPromises.push(uploadPromise)
        }

        await Promise.all(uploadPromises)

        await axios.post('/api/s3-multipart-upload/complete', { sendBackData: { key, uploadId } })

      } catch (error) {
        console.error('Error during upload process:', error)
        toast.error(`Error uploading ${file.name}`)
        return
      }
    }

    onUploadSuccess(true)
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFileOrFolderUpload(acceptedFiles, false)
  }, [])

  const isRemoteLegal = session?.user?.organizationName.toLowerCase() === 'remotelegal'

  return (
    <div className='bg-primary flex flex-col p-[12px] items-center justify-center rounded-[12px] border shadow-sm text-white'>
      <p>Upload Progress: {uploadProgress}%</p>
      <Dropzone onDrop={onDrop} multiple>
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps({
              onClick: (event) => event.stopPropagation(),
            })}
            className={cn(
              'group relative grid h-52 w-full place-items-center rounded-lg border-2 border-dashed border-white px-5 py-2.5 text-center transition',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isDragActive && 'border-white/50'
            )}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <div className='flex flex-col items-center justify-center gap-4 sm:px-5'>
                <div className='rounded-full border border-dashed border-white p-3'>
                  <UploadIcon
                    className='size-7 text-white'
                    aria-hidden='true'
                  />
                </div>
                <p className='font-medium text-white'>
                  Drop files or folders here
                </p>
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-4 sm:px-5'>
                <div className='flex gap-3 text-base font-medium leading-6'>
                  <FileUp />
                  <FolderUp />
                  <div>Upload files or folders</div>
                </div>
                <div className='text-xs self-stretch mt-3.5 leading-5 text-center max-md:mr-1 max-md:max-w-full'>
                  Drag & drop files or folders here or use the options below.
                  <br />
                  <span className='text-xs'>
                    mp3, wav, wma, wmv, avi, flv, mpeg, m4a supported.
                  </span>
                </div>
                <div className='flex gap-4 mt-4 font-semibold text-indigo-600 leading-[133%]'>
                  {!isRemoteLegal && (
                    <>
                      <input
                        id='fileInput'
                        type='file'
                        multiple
                        hidden
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          event.target.files &&
                          handleFileOrFolderUpload(Array.from(event.target.files), false)
                        }
                        accept={FILE_TYPES.join(',')}
                      />
                      <label
                        data-testid='file-uploader'
                        htmlFor='fileInput'
                        className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                      >
                        Choose Files
                      </label>
                    </>
                  )}
                  <input
                    id='folderInput'
                    type='file'
                    multiple
                    hidden
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      event.target.files &&
                      handleFileOrFolderUpload(Array.from(event.target.files), true)
                    }
                    {...({
                      webkitdirectory: 'true',
                      directory: 'true',
                    } as CustomInputAttributes)}
                  />
                  <label
                    data-testid='folder-uploader'
                    htmlFor='folderInput'
                    className='justify-center px-5 py-2 bg-white rounded-[32px] cursor-pointer hover:bg-gray-200'
                  >
                    Choose Folder
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </Dropzone>
    </div>
  )
}

export default FileAndFolderUploader