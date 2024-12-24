'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import Image from 'next/image'
import React, { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { checkUploadSession } from '@/app/actions/s3-upload/check-session'
import { completeMultipartUpload } from '@/app/actions/s3-upload/complete'
import { createMultipartUpload } from '@/app/actions/s3-upload/create'
import { getUploadPartSignedUrl } from '@/app/actions/s3-upload/part'
import { useImportService } from '@/app/context/ImportServiceProvider'
import { useUpload } from '@/app/context/UploadProvider'
import {
  MAX_FILE_SIZE,
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
  const { isDropboxServiceReady, initializeDropbox, dropboxInitError } =
    useImportService()
  const [isPickerLoading, setIsPickerLoading] = useState(false)

  const initializeMultiPartUpload = async (
    file: DropboxFile,
    fileId: string
  ): Promise<StreamingState> => {
    let retryCount = -1

    const checkRes = await checkUploadSession(
      file.name,
      file.size,
      'dropbox',
      file.id
    )

    if (
      checkRes.exists &&
      checkRes.uploadId &&
      checkRes.key &&
      checkRes.parts
    ) {
      const parts = checkRes.parts.map((part) => ({
        ETag: part.ETag as string,
        PartNumber: part.PartNumber as number,
      }))

      return {
        uploadId: checkRes.uploadId,
        key: checkRes.key,
        completedParts: parts,
        totalUploaded: parts.length * MULTI_PART_UPLOAD_CHUNK_SIZE,
        lastFailedPart: null,
        buffer: [],
        bufferSize: 0,
        partNumber: Math.max(...parts.map((p) => p.PartNumber)) + 1,
        abortController: new AbortController(),
        downloadedBytes: parts.length * MULTI_PART_UPLOAD_CHUNK_SIZE,
        totalSize: file.size,
      }
    }

    while (retryCount <= UPLOAD_MAX_RETRIES) {
      try {
        const createRes = await createMultipartUpload(
          file.mimeType,
          file.name,
          fileId,
          file.size,
          'dropbox',
          file.id
        )
        if (!createRes.uploadId || !createRes.key) {
          throw new Error('Missing uploadId or key in response')
        }

        return {
          uploadId: createRes.uploadId,
          key: createRes.key,
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

        continue
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
        const partRes = await getUploadPartSignedUrl(
          {
            key: state.key as string,
            uploadId: state.uploadId as string,
          },
          state.partNumber,
          chunk.size
        )

        const uploadResult = await axios.put(partRes.url as string, chunk, {
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
              status: 'importing',
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
        continue
      }
    }
    throw new Error('Failed to upload part')
  }

  const multiPartUpload = async (
    file: DropboxFile,
    fileId: string
  ): Promise<void> => {
    let state = await initializeMultiPartUpload(file, fileId)

    try {
      let retryCount = -1
      while (true) {
        try {
          const headers: Record<string, string> = {}

          if (state.downloadedBytes > 0) {
            headers['Range'] = `bytes=${state.downloadedBytes}-`
          }

          const downloadResponse = await fetch(file.link, {
            method: 'GET',
            headers,
            signal: state.abortController.signal,
          })
          if (!downloadResponse.ok || !downloadResponse.body) {
            throw new Error('Failed to get file from Dropbox')
          }

          if (state.completedParts.length > 0) {
            updateUploadStatus(file.name, {
              progress: Math.min(
                calculateOverallProgress(
                  (state.downloadedBytes / state.totalSize) * 100,
                  (state.totalUploaded / state.totalSize) * 100
                ),
                99
              ),
              status: 'importing',
            })
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
                status: 'importing',
              })

              if (state.bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
                state = await uploadBufferedPart(state, file.name)
              }
            }
          }

          break
        } catch (error) {
          retryCount++
          if (retryCount >= UPLOAD_MAX_RETRIES) {
            throw new Error(
              `File upload failed after ${UPLOAD_MAX_RETRIES} attempts`
            )
          }

          continue
        }
      }

      retryCount = -1
      const sortedParts = state.completedParts.sort(
        (a, b) => a.PartNumber - b.PartNumber
      )
      while (retryCount <= UPLOAD_MAX_RETRIES) {
        try {
          await completeMultipartUpload(
            {
              key: state.key as string,
              uploadId: state.uploadId as string,
            },
            sortedParts
          )
          break
        } catch (error) {
          retryCount++
          await handleRetryableError(error, retryCount)

          continue
        }
      }
    } catch (error) {
      throw error
    }
  }

  const uploadFile = async (file: DropboxFile): Promise<void> => {
    updateUploadStatus(file.name, {
      progress: 0,
      status: 'importing',
    })

    const fileId = generateUniqueId()

    try {
      await multiPartUpload(file, fileId)

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
      toast.error(
        `Import failed for ${file.name}. Please note that if you try importing the same file again after a few minutes, it will automatically resume from where it stopped.`
      )
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

          const filesUnderSizeLimit = files.filter((file) => {
            const size = parseInt(String(file.bytes))
            if (size > MAX_FILE_SIZE) {
              toast.error(
                `File "${file.name}" was rejected due to exceeding 10GB size limit.`
              )
              return false
            }
            return true
          })
          if (filesUnderSizeLimit.length === 0) {
            if (files.length > 1) {
              toast.error(
                'No valid files selected. Please select supported audio or video files under 10GB in size'
              )
            }
            return
          }

          setIsUploading(true)
          setUploadingFiles(
            filesUnderSizeLimit.map((file) => ({
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

            for (const file of filesUnderSizeLimit) {
              const dropboxFile: DropboxFile = {
                id: file.id,
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
    <div className='bg-white flex flex-col p-[12px] items-center justify-center rounded-[12px] border-2 border-primary shadow-sm'>
      <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
        <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
          <div className='flex items-center gap-1 text-base font-medium leading-6 text-gray-800'>
            <div className='relative w-10 h-10 flex items-center justify-center'>
              <Image
                src='/assets/images/upload/dropbox.svg'
                alt='Dropbox'
                width={40}
                height={40}
                className='object-contain'
                priority
              />
            </div>
            <h4 className='flex items-center'>Dropbox Importer</h4>
          </div>
          <div className='text-xs self-stretch mt-4 leading-5 text-center text-gray-800 max-md:mr-1 max-md:max-w-full'>
            Select files from your Dropbox to import. We will only access the
            selected files.
          </div>
          <button
            onClick={handleDropboxAction}
            disabled={!isDropboxServiceReady || isPickerLoading}
            className='mt-4 px-5 py-2 bg-[#007ee5] rounded-[32px] text-white font-medium border border-[#007ee5] hover:bg-[#0071ce] transition-colors'
          >
            <div className='flex items-center justify-center'>
              {isPickerLoading && (
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              )}
              <span>Select from Dropbox</span>
            </div>
          </button>
          {dropboxInitError && (
            <p className='text-xs text-red-500'>
              Failed to connect to Dropbox. Please try again later.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default DropboxImporter
