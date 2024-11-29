'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import { FileUp } from 'lucide-react'
import React, { useCallback, useRef, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useImportService } from '@/app/context/ImportServiceProvider'
import { useUpload } from '@/app/context/UploadProvider'
import {
  SINGLE_PART_UPLOAD_LIMIT,
  MULTI_PART_UPLOAD_CHUNK_SIZE,
  UPLOAD_MAX_RETRIES,
} from '@/constants'
import {
  StreamingState,
  DropboxChooserFile,
  DropboxFile,
  DropboxChooserOptions,
  UploaderProps,
} from '@/types/upload'
import { generateUniqueId } from '@/utils/generateUniqueId'
import {
  handleRetryableError,
  calculateOverallProgress,
  cleanupUpload,
} from '@/utils/uploadUtils'
import {
  getAllowedFileExtensions,
  getFileTypeFromExtension,
} from '@/utils/validateFileType'

const DropboxImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
  const {
    setUploadingFiles,
    updateUploadStatus,
    initializeSSEConnection,
    isUploading,
    setIsUploading,
  } = useUpload()
  const { isDropboxServiceReady, initializeDropbox } = useImportService()
  const [isPickerLoading, setIsPickerLoading] = useState(false)

  const uploadStatesRef = useRef<Record<string, StreamingState>>({})

  const singlePartUpload = async (
    file: DropboxFile,
    fileId: string
  ): Promise<void> => {
    const abortController = new AbortController()

    let retryCount = -1
    let downloadedBytes = 0
    const totalSize = file.size

    while (retryCount <= UPLOAD_MAX_RETRIES) {
      try {
        const downloadResponse = await fetch(file.link, {
          method: 'GET',
          signal: abortController.signal,
        })

        if (!downloadResponse.ok || !downloadResponse.body) {
          throw new Error('Failed to get file from Dropbox')
        }

        const reader = downloadResponse.body.getReader()
        const chunks: Uint8Array[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          chunks.push(value)
          downloadedBytes += value.length
          const downloadProgress = (downloadedBytes / totalSize) * 100

          updateUploadStatus(file.name, {
            progress: Math.min(
              calculateOverallProgress(downloadProgress, 0),
              99
            ),
            status: 'uploading',
          })
        }

        const blob = new Blob(chunks, { type: file.mimeType })

        const formData = new FormData()
        formData.append('file', blob, file.name)
        formData.append('fileId', fileId)

        await axios.post('/api/s3-upload/single-part', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: abortController.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const uploadProgress =
                (progressEvent.loaded / progressEvent.total) * 100
              updateUploadStatus(file.name, {
                progress: Math.min(
                  calculateOverallProgress(100, uploadProgress),
                  99
                ),
                status: 'uploading',
              })
            }
          },
        })
        return
      } catch (error) {
        retryCount++
        await handleRetryableError(error, retryCount)
      }
    }
  }

  const initializeMultiPartUpload = async (
    file: DropboxFile,
    fileId: string
  ): Promise<StreamingState> => {
    let retryCount = -1

    while (retryCount <= UPLOAD_MAX_RETRIES) {
      try {
        const createRes = await axios.post('/api/s3-upload/multi-part/create', {
          fileInfo: {
            type: file.mimeType,
            originalName: file.name,
            fileId,
          },
        })

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
          totalSize: file.size,
        }
      } catch (error) {
        retryCount++
        await handleRetryableError(error, retryCount)
      }
    }
    throw new Error('Failed to initialize upload')
  }

  const uploadBufferedPart = async (
    state: StreamingState,
    fileName: string
  ): Promise<StreamingState> => {
    if (state.bufferSize === 0) return state

    const chunk = new Blob(state.buffer, { type: 'application/octet-stream' })
    let retryCount = -1

    while (retryCount <= UPLOAD_MAX_RETRIES) {
      try {
        const partRes = await axios.post('/api/s3-upload/multi-part/part', {
          sendBackData: {
            key: state.key,
            uploadId: state.uploadId,
          },
          partNumber: state.partNumber,
          contentLength: chunk.size,
        })

        const uploadResult = await axios.put(partRes.data.url, chunk, {
          headers: { 'Content-Type': 'application/octet-stream' },
          signal: state.abortController.signal,
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return

            const completedSize = state.totalUploaded
            const currentProgress =
              (progressEvent.loaded / progressEvent.total) * chunk.size
            const uploadProgress =
              ((completedSize + currentProgress) / state.totalSize) * 100

            updateUploadStatus(fileName, {
              progress: Math.min(
                calculateOverallProgress(
                  (state.downloadedBytes / state.totalSize) * 100,
                  uploadProgress
                ),
                99
              ),
              status: 'uploading',
            })
          },
        })

        return {
          ...state,
          buffer: [],
          bufferSize: 0,
          completedParts: [
            ...state.completedParts,
            {
              ETag: uploadResult.headers['etag'],
              PartNumber: state.partNumber,
            },
          ],
          totalUploaded: state.totalUploaded + chunk.size,
          partNumber: state.partNumber + 1,
        }
      } catch (error) {
        retryCount++
        await handleRetryableError(error, retryCount)

        state.lastFailedPart = state.partNumber
      }
    }
    throw new Error('Failed to upload part')
  }

  const multiPartUpload = async (
    file: DropboxFile,
    fileId: string
  ): Promise<void> => {
    let state = await initializeMultiPartUpload(file, fileId)
    uploadStatesRef.current[file.name] = state

    try {
      const downloadResponse = await fetch(file.link, {
        method: 'GET',
        signal: state.abortController.signal,
      })

      if (!downloadResponse.ok || !downloadResponse.body) {
        throw new Error('Failed to get file from Dropbox')
      }

      const reader = downloadResponse.body.getReader()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          if (state.bufferSize > 0) {
            state = await uploadBufferedPart(state, file.name)
          }
          break
        }

        if (value) {
          state.buffer.push(value)
          state.bufferSize += value.length
          state.downloadedBytes += value.length

          updateUploadStatus(file.name, {
            progress: Math.min(
              calculateOverallProgress(
                (state.downloadedBytes / state.totalSize) * 100,
                (state.totalUploaded / state.totalSize) * 100
              ),
              99
            ),
            status: 'uploading',
          })

          if (state.bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
            state = await uploadBufferedPart(state, file.name)
          }
        }
      }

      let retryCount = -1
      const sortedParts = state.completedParts.sort(
        (a, b) => a.PartNumber - b.PartNumber
      )

      while (retryCount <= UPLOAD_MAX_RETRIES) {
        try {
          await axios.post('/api/s3-upload/multi-part/complete', {
            sendBackData: {
              key: state.key,
              uploadId: state.uploadId,
              fileName: file.name,
            },
            parts: sortedParts,
          })
          break
        } catch (error) {
          retryCount++
          await handleRetryableError(error, retryCount)
        }
      }
    } catch (error) {
      await cleanupUpload(file.name, state, uploadStatesRef)
      throw error
    }
  }

  const uploadFile = async (file: DropboxFile): Promise<void> => {
    updateUploadStatus(file.name, {
      progress: 0,
      status: 'uploading',
    })

    const fileId = generateUniqueId()

    try {
      if (file.size <= SINGLE_PART_UPLOAD_LIMIT) {
        await singlePartUpload(file, fileId)
      } else {
        await multiPartUpload(file, fileId)
      }

      updateUploadStatus(file.name, {
        progress: 99,
        status: 'processing',
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Import failed'
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'failed',
        error: errorMessage,
      })
      toast.error(`Error importing ${file.name}: ${errorMessage}`)
    }
  }

  const handleDropboxAction = useCallback(async () => {
    try {
      if (isUploading) {
        toast.error(
          'Please wait for current uploads to complete before starting new uploads'
        )
        return
      }

      if (!window.Dropbox) {
        toast.error('Dropbox SDK not initialized')
        return
      }

      setIsPickerLoading(true)

      const chooserOptions: DropboxChooserOptions = {
        linkType: 'direct',
        multiselect: true,
        extensions: getAllowedFileExtensions(),
        folderselect: false,
        success: async (files: DropboxChooserFile[]) => {
          if (files.length === 0) {
            toast.error('Please select one or more files to import')
            return
          }

          setIsUploading(true)
          setUploadingFiles(
            files.map((file) => ({
              name: file.name,
              size: parseInt(String(file.bytes)),
              fileId: file.id,
            }))
          )

          try {
            initializeSSEConnection(
              () => onUploadSuccess(true),
              () => setIsUploading(false)
            )

            for (const file of files) {
              const dropboxFile: DropboxFile = {
                name: file.name,
                size: parseInt(String(file.bytes)),
                mimeType: getFileTypeFromExtension(file.name),
                link: file.link,
              }
              await uploadFile(dropboxFile)
            }
          } catch (error) {
            const errorMessage = axios.isAxiosError(error)
              ? error.response?.data?.error
              : error instanceof Error
              ? error.message
              : 'Import failed'
            toast.error(`Import failed: ${errorMessage}`)
            setIsUploading(false)
          }
        },
      }

      window.Dropbox.choose(chooserOptions)
    } catch (error) {
      setIsPickerLoading(false)

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to Dropbox'
      toast.error(errorMessage)
    } finally {
      setIsPickerLoading(false)
    }
  }, [
    isUploading,
    onUploadSuccess,
    setIsUploading,
    setUploadingFiles,
    initializeSSEConnection,
  ])

  useEffect(() => {
    const initialize = async () => {
      if (!isDropboxServiceReady) {
        try {
          await initializeDropbox()
        } catch (error) {
          toast.error('Failed to initialize Dropbox')
        }
      }
    }

    initialize()
  }, [isDropboxServiceReady, initializeDropbox])

  return (
    <div className='bg-[#007ee5] flex flex-col p-[12px] items-center justify-center rounded-[12px] border border-[#007ee5] shadow-sm'>
      <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
        <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
          <div className='flex gap-3 text-base font-medium leading-6 text-white'>
            <FileUp className='text-white' />
            <h4>Dropbox Importer</h4>
          </div>
          <div className='text-xs self-stretch mt-4 leading-5 text-center text-white max-md:mr-1 max-md:max-w-full'>
            Select files from your Dropbox to import. We will only access the
            selected files.
          </div>
          <button
            onClick={handleDropboxAction}
            disabled={!isDropboxServiceReady || isPickerLoading}
            className='mt-4 px-5 py-2 bg-white rounded-[32px] text-[#007ee5] font-medium border border-white hover:bg-gray-100 transition-colors'
          >
            {!isDropboxServiceReady ? (
              <div className='flex items-center justify-center'>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                <span>Initializing...</span>
              </div>
            ) : isPickerLoading ? (
              <div className='flex items-center justify-center'>
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
                <span>Opening Picker...</span>
              </div>
            ) : (
              'Select from Dropbox'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DropboxImporter
