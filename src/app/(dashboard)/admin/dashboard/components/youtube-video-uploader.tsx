'use client'

import axios from 'axios'
import React, { useRef, useState } from 'react'
import { toast } from 'sonner'

import { checkUploadSession } from '@/app/actions/s3-upload/check-session'
import { completeMultipartUpload } from '@/app/actions/s3-upload/complete'
import { createMultipartUpload } from '@/app/actions/s3-upload/create'
import { getUploadPartSignedUrl } from '@/app/actions/s3-upload/part'
import { checkYouTubeFile } from '@/app/actions/youtube'
import { useUpload } from '@/app/context/UploadProvider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MAX_FILE_SIZE,
  MULTI_PART_UPLOAD_CHUNK_SIZE,
  UPLOAD_MAX_RETRIES,
} from '@/constants'
import { BaseUploadState, FileWithId } from '@/types/upload'
import { handleRetryableError } from '@/utils/uploadUtils'
import validateFileType from '@/utils/validateFileType'

const YouTubeVideoUploader = () => {
  const [fileId, setFileId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { setUploadingFiles, updateUploadStatus, isUploading, setIsUploading } =
    useUpload()

  const initializeUploadState = (): BaseUploadState => ({
    uploadId: null,
    key: null,
    completedParts: [],
    totalUploaded: 0,
    lastFailedPart: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const multiPartUpload = async (file: FileWithId): Promise<void> => {
    let uploadState = initializeUploadState()

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      let retryCount = -1

      const checkRes = await checkUploadSession(
        file.name,
        file.size,
        'local',
        null
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

        uploadState = {
          uploadId: checkRes.uploadId,
          key: checkRes.key,
          completedParts: parts,
          totalUploaded: 0,
          lastFailedPart: null,
        }

        const completedSize =
          uploadState.completedParts.length * MULTI_PART_UPLOAD_CHUNK_SIZE
        const totalProgress = (completedSize / file.size) * 100
        updateUploadStatus(file.name, {
          progress: Math.min(totalProgress, 99),
          status: 'uploading',
        })
      } else {
        while (retryCount <= UPLOAD_MAX_RETRIES && !uploadState.uploadId) {
          try {
            const createRes = await createMultipartUpload(
              file.type,
              file.name,
              file.fileId,
              file.size,
              'local',
              null,
              undefined,
              true
            )
            if (!createRes.uploadId || !createRes.key) {
              throw new Error('Missing uploadId or key in response')
            }

            uploadState = {
              ...uploadState,
              uploadId: createRes.uploadId,
              key: createRes.key,
            }
            break
          } catch (error) {
            retryCount++
            await handleRetryableError(error, retryCount)

            continue
          }
        }
      }

      const numChunks = Math.ceil(file.size / MULTI_PART_UPLOAD_CHUNK_SIZE)
      const completedPartNumbers = new Set(
        uploadState.completedParts.map((p) => p.PartNumber)
      )

      for (let partNumber = 1; partNumber <= numChunks; partNumber++) {
        if (completedPartNumbers.has(partNumber)) continue

        retryCount = -1
        while (retryCount <= UPLOAD_MAX_RETRIES) {
          try {
            const start = (partNumber - 1) * MULTI_PART_UPLOAD_CHUNK_SIZE
            const end = Math.min(
              start + MULTI_PART_UPLOAD_CHUNK_SIZE,
              file.size
            )
            const chunk = file.file.slice(start, end)

            const partRes = await getUploadPartSignedUrl(
              {
                key: uploadState.key as string,
                uploadId: uploadState.uploadId as string,
              },
              partNumber,
              chunk.size
            )

            const uploadResult = await axios.put(partRes.url as string, chunk, {
              headers: { 'Content-Type': file.type },
              signal: abortController.signal,
              onUploadProgress: (progressEvent) => {
                if (!progressEvent.total) return

                const completedSize =
                  uploadState.completedParts.length *
                  MULTI_PART_UPLOAD_CHUNK_SIZE
                const currentProgress =
                  (progressEvent.loaded / progressEvent.total) *
                  MULTI_PART_UPLOAD_CHUNK_SIZE
                const totalProgress =
                  ((completedSize + currentProgress) / file.size) * 100

                updateUploadStatus(file.name, {
                  progress: Math.min(totalProgress, 99),
                  status: 'uploading',
                })
              },
            })

            uploadState.completedParts.push({
              ETag: uploadResult.headers['etag'],
              PartNumber: partNumber,
            })

            uploadState.totalUploaded =
              uploadState.completedParts.length * MULTI_PART_UPLOAD_CHUNK_SIZE
            break
          } catch (error) {
            retryCount++
            await handleRetryableError(error, retryCount)

            uploadState.lastFailedPart = partNumber
            continue
          }
        }
      }

      const sortedParts = uploadState.completedParts.sort(
        (a, b) => a.PartNumber - b.PartNumber
      )

      retryCount = -1
      while (retryCount <= UPLOAD_MAX_RETRIES) {
        try {
          await completeMultipartUpload(
            {
              key: uploadState.key as string,
              uploadId: uploadState.uploadId as string,
            },
            sortedParts,
            true,
            file.fileId
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

  const uploadFile = async (file: FileWithId): Promise<void> => {
    try {
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'uploading',
      })

      await multiPartUpload(file)

      updateUploadStatus(file.name, {
        progress: 100,
        status: 'completed',
      })
      toast.success(`File ${file.name} uploaded successfully`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Upload failed'
      updateUploadStatus(file.name, {
        progress: 0,
        status: 'failed',
        error: errorMessage,
      })
      toast.error(
        `Upload failed for ${file.name}. Please note that if you try uploading the same file again after a few minutes, it will automatically resume from where it stopped.`
      )
    }
  }

  const handleFileUpload = async () => {
    if (isUploading) {
      toast.error(
        'Please wait for current uploads to complete before starting new uploads'
      )
      return
    }

    if (!fileId.trim()) {
      toast.error('Please enter a file ID')
      return
    }

    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 10GB limit')
      return
    }

    if (!validateFileType(selectedFile)) {
      toast.error('Unsupported file type')
      return
    }

    try {
      const checkResult = await checkYouTubeFile(fileId.trim())
      if (!checkResult?.success) {
        toast.error(checkResult?.message)
        return
      }

      setUploadingFiles([])
      setIsUploading(true)

      const fileWithId: FileWithId = {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        fileId: fileId.trim(),
        file: selectedFile,
        isRLDocx: false,
      }

      setUploadingFiles([
        {
          name: selectedFile.name,
          size: selectedFile.size,
          fileId: fileId.trim(),
        },
      ])

      await uploadFile(fileWithId)
    } catch (error) {
      toast.error('Upload failed')
      setIsUploading(false)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setFileId('')
      setSelectedFile(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload YouTube Video</CardTitle>
        <CardDescription>
          Enter the file ID and select a file to upload
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid gap-6'>
          <div className='grid gap-3'>
            <Label htmlFor='file-id'>File ID</Label>
            <Input
              id='file-id'
              type='text'
              className='w-full'
              placeholder='Enter file ID'
              value={fileId}
              onChange={(e) => setFileId(e.target.value)}
            />
          </div>
          <div className='grid gap-3'>
            <Label htmlFor='file-upload'>Select File</Label>
            <Input
              id='file-upload'
              type='file'
              className='w-full cursor-pointer'
              ref={fileInputRef}
              onChange={(e) =>
                setSelectedFile(e.target.files ? e.target.files[0] : null)
              }
            />
          </div>
        </div>
        <Button onClick={handleFileUpload} className='mt-5'>
          Upload
        </Button>
      </CardContent>
    </Card>
  )
}

export default YouTubeVideoUploader
