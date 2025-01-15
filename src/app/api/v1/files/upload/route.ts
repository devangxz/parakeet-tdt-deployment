import axios from 'axios'
import { FileStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { completeMultipartUpload } from '@/app/actions/s3-upload/complete'
import { createMultipartUpload } from '@/app/actions/s3-upload/create'
import { getUploadPartSignedUrl } from '@/app/actions/s3-upload/part'
import {
  MAX_FILE_SIZE,
  MULTI_PART_UPLOAD_CHUNK_SIZE,
  UPLOAD_MAX_RETRIES,
} from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { generateUniqueId } from '@/utils/generateUniqueId'
import { handleRetryableError } from '@/utils/uploadUtils'
import validateFileType, {
  getAllowedFileExtensions,
} from '@/utils/validateFileType'

interface UploadState {
  uploadId: string
  key: string
  completedParts: Array<{ ETag: string; PartNumber: number }>
  totalUploaded: number
}

interface UserInfo {
  userId: number
  internalTeamUserId?: number
}

const insertFileRecord = async (
  fileId: string,
  filename: string,
  userId: number,
  uploadedBy: number,
  size: number,
  duration: number
) => {
  const fileRecord = await prisma.file.create({
    data: {
      fileId,
      filename,
      fileKey: `${filename}_${fileId}.mp3`,
      userId,
      uploadedBy,
      filesize: size.toString(),
      duration,
      fileStatus: FileStatus.NONE,
    },
  })
  return fileRecord
}

export async function POST(req: NextRequest) {
  try {
    const userDetails = await authenticateRequest(req)
    if (!userDetails) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userInfo: UserInfo = {
      userId: userDetails.userId,
      internalTeamUserId: userDetails.internalTeamUserId || undefined,
    }

    const formData = await req.formData()

    const file = formData.get('file') as File
    const url = formData.get('url') as string
    const type = formData.get('type') as string
    const fileId = generateUniqueId()

    if (type === 'ScribieDotComUpload') {
      const filename = formData.get('filename') as string
      const userId = userDetails.internalTeamUserId || userDetails.userId
      const uploadedBy = userDetails.userId
      const size = file.size
      const duration = parseInt(formData.get('duration') as string)

      await insertFileRecord(
        fileId,
        filename.split('.')[0],
        userId,
        uploadedBy,
        size,
        duration
      )
      logger.info('File record inserted successfully', { fileId })
    }

    if (!file && !url) {
      return NextResponse.json(
        { message: 'Either file or URL must be provided' },
        { status: 400 }
      )
    }

    if (file && url) {
      return NextResponse.json(
        { message: 'Both file and URL cannot be provided' },
        { status: 400 }
      )
    }

    logger.info(
      'File details:',
      file ? { name: file.name, size: file.size, type: file.type } : 'No file'
    )

    if (file) {
      logger.info('Handling file upload')
      return handleFileUpload(file, userInfo, fileId)
    } else {
      logger.info('Handling URL upload')
      return handleUrlUpload(url, userInfo, fileId)
    }
  } catch (error) {
    logger.error('Upload failed:', error)
    return new NextResponse(
      JSON.stringify({
        message: error instanceof Error ? error.message : 'Upload failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

async function handleFileUpload(
  file: File,
  userInfo: UserInfo,
  fileId: string
) {
  logger.info('Starting file upload handler', {
    fileName: file.name,
    fileSize: file.size,
  })

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    logger.info('File size exceeds limit', {
      size: file.size,
      limit: MAX_FILE_SIZE,
    })
    return new NextResponse(
      JSON.stringify({ message: 'File exceeds maximum size limit of 10GB' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Validate file type
  if (!validateFileType(file)) {
    logger.info('Invalid file type', { type: file.type })
    return new NextResponse(
      JSON.stringify({
        message: `Unsupported file type. Allowed types: ${getAllowedFileExtensions().join(
          ', '
        )}`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    logger.info('Generated file ID', { fileId })

    // Initialize multipart upload
    logger.info('Initializing multipart upload')
    const initResult = await createMultipartUpload(
      file.type,
      file.name,
      fileId,
      file.size,
      'api',
      null,
      userInfo
    )
    logger.info('Multipart upload initialized', initResult)

    if (!initResult.success || !initResult.uploadId || !initResult.key) {
      logger.error('Failed to initialize upload', initResult)
      throw new Error(initResult.message || 'Failed to initialize upload')
    }

    const uploadState: UploadState = {
      uploadId: initResult.uploadId,
      key: initResult.key,
      completedParts: [],
      totalUploaded: 0,
    }

    // Upload parts
    const numChunks = Math.ceil(file.size / MULTI_PART_UPLOAD_CHUNK_SIZE)
    logger.info('Starting part uploads', { totalParts: numChunks })

    for (let partNumber = 1; partNumber <= numChunks; partNumber++) {
      logger.info(`Processing part ${partNumber}/${numChunks}`)
      let retryCount = -1
      while (retryCount <= UPLOAD_MAX_RETRIES) {
        try {
          const start = (partNumber - 1) * MULTI_PART_UPLOAD_CHUNK_SIZE
          const end = Math.min(start + MULTI_PART_UPLOAD_CHUNK_SIZE, file.size)
          const chunk = file.slice(start, end)
          logger.info(`Uploading chunk`, {
            partNumber,
            start,
            end,
            size: chunk.size,
          })

          const partRes = await getUploadPartSignedUrl(
            {
              key: uploadState.key,
              uploadId: uploadState.uploadId,
            },
            partNumber,
            chunk.size
          )
          logger.info('Got signed URL for part', {
            partNumber,
            success: partRes.success,
          })

          if (!partRes.success || !partRes.url) {
            logger.error('Failed to get upload URL', { partNumber })
            throw new Error('Failed to get upload URL')
          }

          const uploadResult = await axios.put(partRes.url, chunk, {
            headers: { 'Content-Type': file.type },
          })
          logger.info('Part uploaded successfully', {
            partNumber,
            etag: uploadResult.headers['etag'],
          })

          uploadState.completedParts.push({
            ETag: uploadResult.headers['etag'],
            PartNumber: partNumber,
          })

          uploadState.totalUploaded += chunk.size
          logger.info('Upload progress', {
            partNumber,
            totalUploaded: uploadState.totalUploaded,
            percentage:
              ((uploadState.totalUploaded / file.size) * 100).toFixed(2) + '%',
          })
          break
        } catch (error) {
          retryCount++
          logger.info(`Upload retry for part ${partNumber}`, {
            retryCount,
            error,
          })
          await handleRetryableError(error, retryCount)
          continue
        }
      }
    }

    // Complete multipart upload
    logger.info('Completing multipart upload', {
      key: uploadState.key,
      totalParts: uploadState.completedParts.length,
    })
    const completeResult = await completeMultipartUpload(
      {
        key: uploadState.key,
        uploadId: uploadState.uploadId,
      },
      uploadState.completedParts.sort((a, b) => a.PartNumber - b.PartNumber)
    )

    if (!completeResult.success) {
      logger.error('Failed to complete upload', completeResult)
      throw new Error(completeResult.message || 'Failed to complete upload')
    }

    logger.info('Upload completed successfully', { key: uploadState.key })
    return NextResponse.json({
      success: true,
      data: {
        fileId,
      },
    })
  } catch (error) {
    logger.error('File upload failed:', error)
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Upload failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

const extractFileName = (url: string): string => {
  try {
    const urlObj = new URL(url)
    const pathSegments = urlObj.pathname.split('/')
    const fileName = pathSegments[pathSegments.length - 1]
    return decodeURIComponent(fileName || 'imported-file')
  } catch {
    return 'imported-file'
  }
}

async function handleUrlUpload(
  url: string,
  userInfo: UserInfo,
  fileId: string
) {
  logger.info('Starting URL upload handler', { url })
  try {
    // Validate URL and get file metadata
    logger.info('Validating URL')

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    const headResponse = await fetch(`${baseUrl}/auth/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, method: 'HEAD' }),
    })

    if (!headResponse.ok) {
      const error = await headResponse.json()
      logger.info('URL validation failed', error)
      return new NextResponse(
        JSON.stringify({ error: error.error || 'URL validation failed' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { contentType, contentLength } = await headResponse.json()
    logger.info('URL metadata', { contentType, contentLength })

    if (!contentType || !contentLength) {
      logger.info('Missing content type or length')
      return new NextResponse(
        JSON.stringify({
          message: 'Invalid file - Missing content type or size',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const fileName = extractFileName(url)
    logger.info('Generated file details', { fileName, fileId })

    // Initialize multipart upload
    logger.info('Initializing multipart upload')
    const initResult = await createMultipartUpload(
      contentType,
      fileName,
      fileId,
      parseInt(contentLength),
      'api',
      url,
      userInfo
    )
    logger.info('Multipart upload initialized', initResult)

    if (!initResult.success || !initResult.uploadId || !initResult.key) {
      logger.error('Failed to initialize upload', initResult)
      throw new Error(initResult.message || 'Failed to initialize upload')
    }

    const uploadState: UploadState = {
      uploadId: initResult.uploadId,
      key: initResult.key,
      completedParts: [],
      totalUploaded: 0,
    }

    // Download and upload file content
    logger.info('Starting file download')
    const downloadResponse = await fetch(`${baseUrl}/auth/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    if (!downloadResponse.ok) {
      logger.error('Download failed', { status: downloadResponse.status })
      throw new Error('Failed to download file from URL')
    }

    const reader = downloadResponse.body?.getReader()
    if (!reader) {
      logger.error('Failed to get reader for download stream')
      throw new Error('Failed to initialize file reader')
    }

    let buffer: Uint8Array[] = []
    let bufferSize = 0
    let partNumber = 1
    logger.info('Starting streaming download and upload')

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        if (bufferSize > 0) {
          logger.info('Uploading final buffer', { size: bufferSize })
          await uploadPart(
            buffer,
            bufferSize,
            partNumber,
            uploadState,
            contentType
          )
        }
        break
      }

      if (value) {
        buffer.push(value)
        bufferSize += value.length
        logger.info('Buffer accumulation', { currentSize: bufferSize })

        if (bufferSize >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
          logger.info(`Uploading part ${partNumber}`, { size: bufferSize })
          await uploadPart(
            buffer,
            bufferSize,
            partNumber,
            uploadState,
            contentType
          )
          buffer = []
          bufferSize = 0
          partNumber++
        }
      }
    }

    // Complete multipart upload
    logger.info('Completing multipart upload', {
      totalParts: uploadState.completedParts.length,
    })
    const completeResult = await completeMultipartUpload(
      {
        key: uploadState.key,
        uploadId: uploadState.uploadId,
      },
      uploadState.completedParts.sort((a, b) => a.PartNumber - b.PartNumber)
    )

    if (!completeResult.success) {
      logger.error('Failed to complete upload', completeResult)
      throw new Error(completeResult.message || 'Failed to complete upload')
    }

    logger.info('URL upload completed successfully', { key: uploadState.key })
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          fileId,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logger.error('URL upload failed:', error)
    return new NextResponse(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Upload failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

async function uploadPart(
  buffer: Uint8Array[],
  bufferSize: number,
  partNumber: number,
  state: UploadState,
  contentType: string
) {
  logger.info(`Starting part upload`, { partNumber, bufferSize })
  const chunk = new Blob(buffer, { type: contentType })
  let retryCount = -1

  while (retryCount <= UPLOAD_MAX_RETRIES) {
    try {
      logger.info(`Getting signed URL for part ${partNumber}`)
      const partRes = await getUploadPartSignedUrl(
        {
          key: state.key,
          uploadId: state.uploadId,
        },
        partNumber,
        chunk.size
      )

      if (!partRes.success || !partRes.url) {
        logger.error('Failed to get upload URL', { partNumber })
        throw new Error('Failed to get upload URL')
      }

      const uploadResult = await axios.put(partRes.url, chunk, {
        headers: { 'Content-Type': contentType },
      })

      state.completedParts.push({
        ETag: uploadResult.headers['etag'],
        PartNumber: partNumber,
      })

      state.totalUploaded += chunk.size
      return
    } catch (error) {
      retryCount++
      await handleRetryableError(error, retryCount)
      continue
    }
  }

  throw new Error(`Failed to upload part ${partNumber}`)
}
