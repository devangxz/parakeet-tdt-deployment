'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import Image from 'next/image'
import React, { useCallback, useRef, useState } from 'react'
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
  BoxFile,
  BoxSelect,
  UploaderProps,
} from '@/types/upload'
import { generateUniqueId } from '@/utils/generateUniqueId'
import {
  handleRetryableError,
  calculateOverallProgress,
  refreshToken,
} from '@/utils/uploadUtils'
import validateFileType, {
  getFileTypeFromExtension,
} from '@/utils/validateFileType'

const BOX_CLIENT_ID = process.env.NEXT_PUBLIC_BOX_CLIENT_ID!

const BoxImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
  const {
    setUploadingFiles,
    updateUploadStatus,
    initializeSSEConnection,
    isUploading,
    setIsUploading,
  } = useUpload()
  const { isBoxServiceReady, boxInitError } = useImportService()
  const [isPickerLoading, setIsPickerLoading] = useState(false)

  const authWindowRef = useRef<Window | null>(null)
  const boxSelectRef = useRef<BoxSelect | null>(null)

  const initializeMultiPartUpload = async (
    file: BoxFile,
    fileId: string
  ): Promise<StreamingState> => {
    let retryCount = -1

    const checkRes = await checkUploadSession(
      file.name,
      file.size,
      'box',
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
          file.type,
          file.name,
          fileId,
          file.size,
          'box',
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
    file: BoxFile,
    fileId: string,
    token: string
  ): Promise<void> => {
    let state = await initializeMultiPartUpload(file, fileId)

    try {
      let retryCount = -1
      while (true) {
        try {
          const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
          }

          if (state.downloadedBytes > 0) {
            headers['Range'] = `bytes=${state.downloadedBytes}-`
          }

          const downloadResponse = await fetch(
            `https://api.box.com/2.0/files/${file.id}/content`,
            {
              headers,
              signal: state.abortController.signal,
            }
          )
          if (!downloadResponse.ok || !downloadResponse.body) {
            throw new Error('Failed to get file stream from Box')
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

          let tokenResponse = await axios.get('/auth/box/token')
          if (!tokenResponse.data.token) {
            const refreshSuccess = await refreshToken('box')
            if (refreshSuccess) {
              tokenResponse = await axios.get('/auth/box/token')
            } else {
              throw new Error('Failed to get valid authentication token')
            }
          }
          if (tokenResponse.data.token) {
            token = tokenResponse.data.token
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

  const uploadFile = async (file: BoxFile): Promise<void> => {
    updateUploadStatus(file.name, {
      progress: 0,
      status: 'importing',
    })

    const fileId = generateUniqueId()

    try {
      let tokenResponse = await axios.get('/auth/box/token')
      if (!tokenResponse.data.token) {
        const refreshSuccess = await refreshToken('box')
        if (refreshSuccess) {
          tokenResponse = await axios.get('/auth/box/token')
        } else {
          throw new Error('Failed to get valid authentication token')
        }
      }

      await multiPartUpload(file, fileId, tokenResponse.data.token)

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

  const handlePickerCallback = async (files: BoxFile[]) => {
    if (!files || files.length === 0) {
      toast.error('Please select one or more files to import')
      return
    }

    if (isUploading) {
      toast.error(
        'Please wait for current uploads to complete before starting new uploads'
      )
      return
    }

    const filesUnderSizeLimit = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
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

    try {
      const filesWithTypes = filesUnderSizeLimit.map((file) => ({
        ...file,
        type: getFileTypeFromExtension(file.name),
      }))

      const allowedFiles = filesWithTypes.filter((file) =>
        validateFileType(file as unknown as File)
      )
      const rejectedFiles = filesWithTypes.filter(
        (file) => !validateFileType(file as unknown as File)
      )

      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach((file) => {
          toast.error(
            `File "${file.name}" was rejected due to unsupported file type.`
          )
        })
      }
      if (allowedFiles.length === 0) {
        setIsUploading(false)
        return
      }

      const processedFiles = allowedFiles.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
      }))

      setIsUploading(true)
      setUploadingFiles(
        processedFiles.map((file) => ({
          name: file.name,
          size: file.size,
          fileId: file.id,
        }))
      )

      initializeSSEConnection(
        () => onUploadSuccess(true),
        () => setIsUploading(false)
      )

      for (const file of processedFiles) {
        await uploadFile(file)
      }
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error
        : error instanceof Error
        ? error.message
        : 'Import failed'
      toast.error(`Import failed: ${errorMessage}`)
      setIsUploading(false)
    } finally {
      setIsUploading(false)
    }
  }

  const showPicker = useCallback(
    async (accessToken: string) => {
      if (!window.BoxSelect) {
        toast.error('BoxSelect not initialized')
        return
      }

      if (!accessToken) return

      try {
        boxSelectRef.current = new window.BoxSelect({
          clientId: BOX_CLIENT_ID,
          linkType: 'direct',
          multiselect: true,
          token: accessToken,
        })

        boxSelectRef.current.success((files: BoxFile[]) => {
          handlePickerCallback(files)
        })

        boxSelectRef.current.launchPopup()
      } catch (error) {
        toast.error(
          'Failed to open file picker. Please try authenticating again.'
        )
      }
    },
    [handlePickerCallback]
  )

  const getTokenAndShowPicker = async () => {
    try {
      let tokenResponse = await axios.get('/auth/box/token')
      if (!tokenResponse.data.token) {
        const refreshSuccess = await refreshToken('box')
        if (refreshSuccess) {
          tokenResponse = await axios.get('/auth/box/token')
        } else {
          throw new Error('Failed to get valid token')
        }
      }

      await showPicker(tokenResponse.data.token)
    } catch (error) {
      toast.error(
        'Failed to get access token. Please try authenticating again.'
      )
    }
  }

  const authenticate = useCallback(async () => {
    try {
      const left = window.screenX + (window.outerWidth - 600) / 2
      const top = window.screenY + (window.outerHeight - 600) / 2

      const popup = window.open(
        '/auth/box',
        'BoxAuth',
        `width=${600},height=${600},left=${left},top=${top}`
      )

      if (!popup) {
        throw new Error('Popup blocked. Please enable popups and try again.')
      }

      authWindowRef.current = popup

      await new Promise<void>((resolve, reject) => {
        const handleAuthMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'BOX_AUTH_SUCCESS') {
            window.removeEventListener('message', handleAuthMessage)
            resolve()
          } else if (event.data?.type === 'BOX_AUTH_ERROR') {
            window.removeEventListener('message', handleAuthMessage)
            reject(new Error('Authentication failed'))
          }
        }

        window.addEventListener('message', handleAuthMessage)

        const checkPopup = setInterval(() => {
          if (authWindowRef.current?.closed) {
            clearInterval(checkPopup)
            window.removeEventListener('message', handleAuthMessage)
            reject(new Error('Authentication window was closed'))
          }
        }, 500)
      })

      setIsPickerLoading(true)

      await getTokenAndShowPicker()
    } catch (error) {
      setIsPickerLoading(false)

      const errorMessage =
        error instanceof Error ? error.message : 'Authentication failed'
      toast.error(errorMessage)
    } finally {
      setIsPickerLoading(false)

      if (authWindowRef.current) {
        authWindowRef.current = null
      }
    }
  }, [showPicker])

  const handleBoxAction = useCallback(async () => {
    try {
      if (isUploading) {
        toast.error(
          'Please wait for current uploads to complete before starting new uploads'
        )
        return
      }

      setIsPickerLoading(true)

      const validationResponse = await axios.get('/auth/box/token/validate')
      if (validationResponse.data.isValid) {
        await getTokenAndShowPicker()
        setIsPickerLoading(false)
        return
      }
      if (validationResponse.data.needsRefresh) {
        const refreshSuccess = await refreshToken('box')
        if (refreshSuccess) {
          await getTokenAndShowPicker()
          setIsPickerLoading(false)
          return
        }
      }

      await authenticate()
    } catch (error) {
      setIsPickerLoading(false)

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to connect to Box'
      toast.error(errorMessage)
    } finally {
      setIsPickerLoading(false)
    }
  }, [isUploading, authenticate, showPicker])

  return (
    <div className='bg-white flex flex-col p-[12px] items-center justify-center rounded-[12px] border-2 border-primary shadow-sm'>
      <div className='group relative w-full flex rounded-lg px-5 py-2.5 text-center transition min-h-[13rem]'>
        <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
          <div className='flex items-center gap-1 text-base font-medium leading-6 text-gray-800'>
            <div className='relative w-10 h-10 flex items-center justify-center'>
              <Image
                src='/assets/images/upload/box.svg'
                alt='Box'
                width={40}
                height={40}
                className='object-contain'
                priority
              />
            </div>
            <h4 className='flex items-center'>Box Importer</h4>
          </div>
          <div className='text-xs self-stretch mt-4 leading-5 text-center text-gray-800 max-md:mr-1 max-md:max-w-full'>
            Select files from your Box account to import. Please allow
            Scribie.ai Importer in the popup to access your Box files for the
            import process. We will only access the selected files.
          </div>
          <button
            onClick={handleBoxAction}
            disabled={!isBoxServiceReady || isPickerLoading}
            className='mt-4 px-5 py-2 bg-[#009dd6] rounded-[32px] text-white font-medium border border-[#009dd6] hover:bg-[#008cbf] transition-colors'
          >
            <div className='flex items-center justify-center'>
              {isPickerLoading && (
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              )}
              <span>Select from Box</span>
            </div>
          </button>
          {boxInitError && (
            <p className='text-xs text-red-500'>
              Failed to connect to Box. Please try again later.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default BoxImporter
