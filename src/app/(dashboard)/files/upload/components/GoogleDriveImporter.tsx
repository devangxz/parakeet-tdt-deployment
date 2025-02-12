'use client'

import { ReloadIcon } from '@radix-ui/react-icons'
import axios from 'axios'
import Image from 'next/image'
import React, { useCallback, useState } from 'react'
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
  GoogleDriveFile,
  GooglePickerResponse,
  UploaderProps,
} from '@/types/upload'
import { generateUniqueId } from '@/utils/generateUniqueId'
import {
  handleRetryableError,
  calculateOverallProgress,
  refreshToken,
  sanitizeFileName,
} from '@/utils/uploadUtils'
import { getAllowedMimeTypes } from '@/utils/validateFileType'

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY!
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
const GOOGLE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID!

const GoogleDriveImporter: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
  const {
    setUploadingFiles,
    updateUploadStatus,
    initializeSSEConnection,
    isUploading,
    setIsUploading,
  } = useUpload()
  const { isGoogleDriveServiceReady, googleDriveInitError } = useImportService()
  const [isPickerLoading, setIsPickerLoading] = useState(false)

  const initializeMultiPartUpload = async (
    file: GoogleDriveFile,
    fileId: string
  ): Promise<StreamingState> => {
    let retryCount = -1

    const checkRes = await checkUploadSession(
      file.name,
      parseInt(file.sizeBytes),
      'google-drive',
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
        totalSize: parseInt(file.sizeBytes),
      }
    }

    while (retryCount <= UPLOAD_MAX_RETRIES) {
      try {
        const createRes = await createMultipartUpload(
          file.mimeType,
          file.name,
          fileId,
          parseInt(file.sizeBytes),
          'google-drive',
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
          totalSize: parseInt(file.sizeBytes),
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
    file: GoogleDriveFile,
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
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            {
              headers,
              signal: state.abortController.signal,
            }
          )
          if (!downloadResponse.ok || !downloadResponse.body) {
            throw new Error('Failed to get file stream from Google Drive')
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

          let tokenResponse = await axios.get('/auth/google-drive/token')
          if (!tokenResponse.data.token) {
            const refreshSuccess = await refreshToken('google-drive')
            if (refreshSuccess) {
              tokenResponse = await axios.get('/auth/google-drive/token')
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

  const uploadFile = async (file: GoogleDriveFile): Promise<void> => {
    updateUploadStatus(file.name, {
      progress: 0,
      status: 'importing',
    })

    const fileId = generateUniqueId()

    try {
      let tokenResponse = await axios.get('/auth/google-drive/token')
      if (!tokenResponse.data.token) {
        const refreshSuccess = await refreshToken('google-drive')
        if (refreshSuccess) {
          tokenResponse = await axios.get('/auth/google-drive/token')
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

  const handlePickerCallback = async (data: GooglePickerResponse) => {
    if (data.action !== window.google.picker.Action.PICKED) return

    if (isUploading) {
      toast.error(
        'Please wait for current uploads to complete before starting new uploads'
      )
      return
    }

    try {
      let selectedFiles = data.docs

      selectedFiles = selectedFiles.map((file) => {
        const sanitizedName = sanitizeFileName(file.name)
        if (sanitizedName === file.name) return file

        file.name = sanitizedName

        return file
      })

      const filesUnderSizeLimit = selectedFiles.filter(
        (file: GoogleDriveFile) => {
          const size = parseInt(file.sizeBytes)
          if (size > MAX_FILE_SIZE) {
            toast.error(
              `File "${file.name}" was rejected due to exceeding 10GB size limit.`
            )
            return false
          }
          return true
        }
      )
      if (filesUnderSizeLimit.length === 0) {
        if (selectedFiles.length > 1) {
          toast.error(
            'No valid files selected. Please select supported audio or video files under 10GB in size'
          )
        }
        return
      }

      setIsUploading(true)
      setUploadingFiles(
        filesUnderSizeLimit.map((file: GoogleDriveFile) => ({
          name: file.name,
          size: parseInt(file.sizeBytes),
          fileId: file.id,
        }))
      )

      initializeSSEConnection(
        () => onUploadSuccess(true),
        () => setIsUploading(false)
      )

      for (const file of filesUnderSizeLimit) {
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
      if (!window.google?.picker || !accessToken) return

      try {
        const { status } = await axios.get(
          `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`
        )

        if (status !== 200) {
          throw new Error('Invalid token')
        }

        const view = new window.google.picker.DocsView()
          .setMimeTypes(getAllowedMimeTypes().join(','))
          .setIncludeFolders(true)

        const picker = new window.google.picker.PickerBuilder()
          .addView(view)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .enableFeature(window.google.picker.Feature.SUPPORT_DRIVES)
          .setTitle('Select Files')
          .setAppId(GOOGLE_APP_ID)
          .setOAuthToken(accessToken)
          .setDeveloperKey(GOOGLE_API_KEY)
          .setCallback(handlePickerCallback)
          .build()

        picker.setVisible(true)
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
      let tokenResponse = await axios.get('/auth/google-drive/token')
      if (!tokenResponse.data.token) {
        const refreshSuccess = await refreshToken('google-drive')
        if (refreshSuccess) {
          tokenResponse = await axios.get('/auth/google-drive/token')
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
    if (!window.google?.accounts?.oauth2) {
      toast.error('Failed to initialize Google authentication')
      return
    }

    const tokenClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.file',
      ux_mode: 'popup',
      callback: async (response: { error?: string; code?: string }) => {
        if (response.error) {
          toast.error('Authentication failed. Please try again.')
          return
        }

        try {
          setIsPickerLoading(true)

          const result = await axios.post('/auth/google-drive', {
            code: response.code,
          })

          if (result.data.success) {
            await getTokenAndShowPicker()
          } else {
            throw new Error('Authentication failed')
          }
        } catch {
          setIsPickerLoading(false)
          toast.error('Authentication failed. Please try again.')
        } finally {
          setIsPickerLoading(false)
        }
      },
    })

    tokenClient.requestCode()
  }, [showPicker])

  const handleDriveAction = useCallback(async () => {
    try {
      if (isUploading) {
        toast.error(
          'Please wait for current uploads to complete before starting new uploads'
        )
        return
      }

      setIsPickerLoading(true)

      const validationResponse = await axios.get(
        '/auth/google-drive/token/validate'
      )
      if (validationResponse.data.isValid) {
        await getTokenAndShowPicker()
        setIsPickerLoading(false)
        return
      }
      if (validationResponse.data.needsRefresh) {
        const refreshSuccess = await refreshToken('google-drive')
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
        error instanceof Error
          ? error.message
          : 'Failed to connect to Google Drive'
      toast.error(errorMessage)
    } finally {
      setIsPickerLoading(false)
    }
  }, [isUploading, authenticate, showPicker])

  return (
    <div className='bg-background flex flex-col p-[12px] items-center justify-center rounded-md border-2 border-customBorder shadow-sm min-h-[245px]'>
      <div className='group relative w-full flex rounded-md px-5 py-2.5 text-center transition'>
        <div className='self-center w-full flex flex-col items-center justify-center gap-4 sm:px-5'>
          <div className='flex items-center gap-1 text-base font-medium leading-6'>
            <div className='relative w-10 h-10 flex items-center justify-center'>
              <Image
                src='/assets/images/upload/google-drive.svg'
                alt='Google Drive'
                width={40}
                height={40}
                className='object-contain'
                priority
              />
            </div>
            <h4 className='flex items-center'>Google Drive Importer</h4>
          </div>
          <div className='text-xs self-stretch mt-4 leading-5 text-center text-muted-foreground max-md:mr-1 max-md:max-w-full'>
            Select files from your Google Drive to import. Please allow
            Scribie.ai Importer in the popup to access your Google Drive files
            for the import process. We will only access the selected files. The
            permissions can be revoked from your{' '}
            <a
              href='https://security.google.com/settings/security/permissions'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:text-blue-800 underline'
            >
              Google Account Settings
            </a>{' '}
            page anytime.
          </div>
          <button
            onClick={handleDriveAction}
            disabled={!isGoogleDriveServiceReady || isPickerLoading}
            className='mt-4 px-5 py-2 bg-[#00ac47] rounded-[32px] text-white font-medium border border-[#00ac47] hover:bg-[#009940] transition-colors'
          >
            <div className='flex items-center justify-center'>
              {isPickerLoading && (
                <ReloadIcon className='mr-2 h-4 w-4 animate-spin' />
              )}
              <span>Select from Google Drive</span>
            </div>
          </button>
          {googleDriveInitError && (
            <p className='text-xs text-red-500'>
              Failed to connect to Google Drive. Please try again later.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default GoogleDriveImporter
