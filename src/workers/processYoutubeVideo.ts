import { spawn } from 'child_process'

import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'

import logger from '../lib/logger'
import { s3Client } from '../lib/s3Client'

interface YouTubeProcessResult {
  status: 'SUCCESS' | 'ERROR'
  userId: string
  fileId: string
  youtubeUrl: string
  fileSize?: number
  error?: string
}

const MULTI_PART_UPLOAD_CHUNK_SIZE = 20 * 1024 * 1024
const MAX_BUFFER_SIZE = MULTI_PART_UPLOAD_CHUNK_SIZE * 5
const RESUME_THRESHOLD = MULTI_PART_UPLOAD_CHUNK_SIZE * 2
const UPLOAD_MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

function isActualError(message: string): boolean {
  const ignoredPatterns = [
    'Extracting URL',
    'Downloading webpage',
    'Downloading ios player',
    'Downloading mweb player',
    'Downloading m3u8',
    'Downloading 1 format',
    '[download]',
  ]
  return !ignoredPatterns.some((pattern) => message.includes(pattern))
}

async function uploadPart(
  bucket: string,
  key: string,
  uploadId: string,
  partNumber: number,
  body: Buffer,
  fileId: string
): Promise<{ ETag: string; PartNumber: number }> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
    try {
      const response = await s3Client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: body,
        })
      )

      if (!response.ETag) {
        throw new Error('No ETag received for uploaded part')
      }

      if (partNumber === 1) {
        logger.info(
          `[${fileId}] First chunk upload successful, transfer started`
        )
      }

      return {
        ETag: response.ETag,
        PartNumber: partNumber,
      }
    } catch (error) {
      lastError = error as Error
      if (attempt === UPLOAD_MAX_RETRIES) {
        logger.error(
          `[${fileId}] Part ${partNumber} upload failed after ${UPLOAD_MAX_RETRIES} attempts: ${lastError.message}`
        )
        throw lastError
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt)
      )
    }
  }
  throw lastError
}

async function downloadAndStreamToS3(
  url: string,
  fileKey: string,
  fileId: string
): Promise<number> {
  let totalBytes = 0
  let downloadStarted = false

  const multipartUpload = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileKey,
      ContentType: 'video/mp4',
    })
  )

  const uploadId = multipartUpload.UploadId!
  logger.info(`[${fileId}] Initialized download for: ${url}`)

  try {
    let partNumber = 1
    const parts: { ETag: string; PartNumber: number }[] = []
    let buffer = Buffer.alloc(0)
    let uploadPromise = Promise.resolve()
    let isStreamPaused = false

    await new Promise<void>((resolve, reject) => {
      const ytDlp = spawn('yt-dlp', [
        '-f',
        'b[height<=480][ext=mp4]/b[ext=mp4]',
        '--no-playlist',
        '--no-warnings',
        '-o',
        '-',
        url,
      ])

      ytDlp.stdout.on('data', async (chunk: Buffer) => {
        try {
          if (!downloadStarted) {
            downloadStarted = true
            logger.info(`[${fileId}] Video download started`)
          }

          totalBytes += chunk.length

          if (buffer.length + chunk.length > MAX_BUFFER_SIZE) {
            ytDlp.stdout.pause()
            isStreamPaused = true
          }

          buffer = Buffer.concat([buffer, chunk])

          while (buffer.length >= MULTI_PART_UPLOAD_CHUNK_SIZE) {
            const part = buffer.slice(0, MULTI_PART_UPLOAD_CHUNK_SIZE)
            buffer = buffer.slice(MULTI_PART_UPLOAD_CHUNK_SIZE)

            const currentPartNumber = partNumber++

            uploadPromise = uploadPromise
              .then(async () => {
                const uploadedPart = await uploadPart(
                  process.env.AWS_S3_BUCKET_NAME!,
                  fileKey,
                  uploadId,
                  currentPartNumber,
                  part,
                  fileId
                )
                parts.push(uploadedPart)

                if (isStreamPaused && buffer.length < RESUME_THRESHOLD) {
                  ytDlp.stdout.resume()
                  isStreamPaused = false
                }
              })
              .catch((error) => {
                logger.error(
                  `[${fileId}] Upload failed for part ${currentPartNumber}: ${error.message}`
                )
                throw error
              })
          }
        } catch (error) {
          reject(error)
        }
      })

      ytDlp.stderr.on('data', (data) => {
        const errorMsg = data.toString().trim()
        if (isActualError(errorMsg)) {
          logger.error(`[${fileId}] Download error: ${errorMsg}`)
        }
      })

      ytDlp.on('close', async (code) => {
        if (code === 0) {
          try {
            logger.info(`[${fileId}] Download completed, finalizing upload...`)
            await uploadPromise

            if (buffer.length > 0) {
              const finalPartNumber = partNumber
              const uploadedPart = await uploadPart(
                process.env.AWS_S3_BUCKET_NAME!,
                fileKey,
                uploadId,
                finalPartNumber,
                buffer,
                fileId
              )
              parts.push(uploadedPart)
            }

            parts.sort((a, b) => a.PartNumber - b.PartNumber)

            await s3Client.send(
              new CompleteMultipartUploadCommand({
                Bucket: process.env.AWS_S3_BUCKET_NAME!,
                Key: fileKey,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
              })
            )
            resolve()
          } catch (error) {
            reject(error)
          }
        } else {
          reject(new Error(`Download failed with code ${code}`))
        }
      })

      ytDlp.on('error', (error) => {
        logger.error(`[${fileId}] Process error: ${error.message}`)
        reject(error)
      })
    })

    return totalBytes
  } catch (error) {
    logger.error(`[${fileId}] Processing failed: ${(error as Error).message}`)
    try {
      await s3Client.send(
        new AbortMultipartUploadCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: fileKey,
          UploadId: uploadId,
        })
      )
      logger.info(`[${fileId}] Upload aborted due to error`)
    } catch (abortError) {
      logger.error(
        `[${fileId}] Failed to abort upload: ${(abortError as Error).message}`
      )
    }
    throw error
  }
}

export async function processYoutubeVideo(
  userId: string,
  fileId: string,
  youtubeUrl: string,
  fileKey: string
): Promise<YouTubeProcessResult> {
  logger.info(`[${fileId}] Starting process for: ${youtubeUrl}`)

  try {
    const fileSize = await downloadAndStreamToS3(youtubeUrl, fileKey, fileId)

    logger.info(
      `[${fileId}] Processing completed. Total size: ${(
        fileSize /
        (1024 * 1024)
      ).toFixed(2)}MB`
    )

    return {
      status: 'SUCCESS',
      userId,
      fileId,
      youtubeUrl,
      fileSize,
    }
  } catch (error) {
    logger.error(`[${fileId}] Error processing file: ${error}`)

    return {
      status: 'ERROR',
      userId,
      fileId,
      youtubeUrl,
      error: (error as Error).message,
    }
  }
}
