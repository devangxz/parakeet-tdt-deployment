import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'
import { promisify } from 'util'

import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import ffmpeg from 'fluent-ffmpeg'

import logger from '../lib/logger'
import { s3Client } from '../lib/s3Client'

const execPromise = promisify(exec)
const mkdir = promisify(fs.mkdir)
const unlink = promisify(fs.unlink)
const access = promisify(fs.access)

const ffmpegPath = process.env.FFMPEG_PATH
const ffprobePath = process.env.FFPROBE_PATH

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)
if (ffprobePath) ffmpeg.setFfprobePath(ffprobePath)

interface ConversionResult {
  status: 'SUCCESS' | 'ERROR'
  userId: string
  fileId: string
  duration?: number
  error?: string
}
interface FFmpegError extends Error {
  code?: string
  exitCode?: number
  killed?: boolean
  signal?: string
  stderr?: string
}
enum FFmpegExitCode {
  SUCCESS = 0,
  GENERIC_ERROR = 1,
  MISSING_ARGUMENT = 2,
  INVALID_OPTION = 3,
  CODEC_NOT_FOUND = 4,
  PERMISSION_DENIED = 5,
  INVALID_INPUT = 6,
  MEMORY_ERROR = 7,
  SYSTEM_ERROR = 8,
  PROTOCOL_ERROR = 9,
  FILE_NOT_FOUND = 10,
}
enum ProcessSignal {
  OUT_OF_MEMORY = 'SIGKILL',
  INTERRUPTED = 'SIGINT',
  TERMINATED = 'SIGTERM',
}

const PERSISTENT_STORAGE_PATH =
  process.env.CONVERSION_WORKER_PERSISTENT_STORAGE_PATH
const VIDEO_EXTENSIONS = [
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.mkv',
  '.webm',
  '.mpg',
  '.mpeg',
  '.m4v',
  '.3gp',
  '.mts',
  '.3ga',
  '.ogv',
  '.mxf',
]
const CONVERSION_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
}
const SINGLE_PART_UPLOAD_LIMIT = 100 * 1024 * 1024
const MULTI_PART_UPLOAD_CHUNK_SIZE = 20 * 1024 * 1024
const UPLOAD_MAX_RETRIES = 3

class PersistentStorageHandler {
  private persistentPath: string
  private readonly MAX_DELETE_RETRIES = 3
  private readonly DELETE_RETRY_DELAY = 1000

  constructor() {
    if (!PERSISTENT_STORAGE_PATH) {
      throw new Error(
        'CONVERSION_WORKER_PERSISTENT_STORAGE_PATH environment variable is not set'
      )
    }
    this.persistentPath = PERSISTENT_STORAGE_PATH
    this.initStorage()
  }

  private async initStorage() {
    try {
      await access(this.persistentPath)
    } catch {
      await mkdir(this.persistentPath, { recursive: true })
    }
  }

  private async checkStorageSpace(fileKey: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.statfs(this.persistentPath, (err, stats) => {
        if (err) {
          logger.error(`[${fileKey}] Error checking storage space: ${err}`)
          resolve(false)
          return
        }

        const availableGB = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024)
        resolve(availableGB > 1)
      })
    })
  }

  public async saveStreamToStorage(
    stream: Readable,
    fileName: string,
    fileKey: string
  ): Promise<string> {
    const hasSpace = await this.checkStorageSpace(fileKey)
    if (!hasSpace) {
      throw new Error('Insufficient storage space')
    }

    const filePath = this.getFilePath(fileName)

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(filePath)
      stream.pipe(writeStream)

      writeStream.on('finish', () => resolve(filePath))
      writeStream.on('error', async (error) => {
        await this.deleteFile(filePath, fileKey).catch(() => {})
        reject(error)
      })
    })
  }

  public async deleteFile(filePath: string, fileKey: string): Promise<void> {
    for (let attempt = 1; attempt <= this.MAX_DELETE_RETRIES; attempt++) {
      try {
        const exists = await this.fileExists(filePath)
        if (exists) {
          await unlink(filePath)
          logger.info(`[${fileKey}] Successfully deleted file: ${filePath}`)
        }
        return
      } catch (error) {
        if (attempt === this.MAX_DELETE_RETRIES) {
          logger.error(
            `[${fileKey}] Failed to delete file ${filePath} after ${this.MAX_DELETE_RETRIES} attempts: ${error}`
          )
          return
        }
        await delay(this.DELETE_RETRY_DELAY * attempt)
      }
    }
  }

  public getFilePath(fileName: string): string {
    return path.join(this.persistentPath, fileName)
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath, fs.constants.F_OK)
      return true
    } catch {
      return false
    }
  }
}

const storageHandler = new PersistentStorageHandler()
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const calculateBackoffDelay = (attempt: number): number =>
  CONVERSION_RETRY_CONFIG.initialDelayMs *
  Math.pow(CONVERSION_RETRY_CONFIG.backoffMultiplier, attempt - 1)

async function downloadFromS3(fileKey: string): Promise<string | null> {
  try {
    const { Body } = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: fileKey,
      })
    )

    return await storageHandler.saveStreamToStorage(
      Body as Readable,
      path.basename(fileKey),
      fileKey
    )
  } catch (error) {
    logger.error(`[${fileKey}] Failed to download file from S3: ${error}`)
    return null
  }
}

async function singlePartUpload(filePath: string, key: string): Promise<void> {
  let attempt = 0
  while (attempt < UPLOAD_MAX_RETRIES) {
    try {
      const fileStream = fs.createReadStream(filePath)
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: key,
          Body: fileStream,
          Metadata: { type: 'CONVERTED_FILE' },
        })
      )
      return
    } catch (error) {
      attempt++
      if (attempt === UPLOAD_MAX_RETRIES) throw error
      await delay(1000 * attempt)
    }
  }
}

function readFileChunk(
  filePath: string,
  start: number,
  end: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunk = Buffer.alloc(end - start)
    const stream = fs.createReadStream(filePath, { start, end: end - 1 })
    let position = 0

    stream.on('data', (data: Buffer) => {
      data.copy(chunk, position)
      position += data.length
    })

    stream.on('end', () => resolve(chunk))
    stream.on('error', reject)
  })
}

async function multiPartUpload(
  filePath: string,
  key: string,
  fileSize: number,
  originalFileKey: string
): Promise<void> {
  const numParts = Math.ceil(fileSize / MULTI_PART_UPLOAD_CHUNK_SIZE)
  let uploadId: string | undefined

  try {
    const multipartUpload = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        Metadata: { type: 'CONVERTED_FILE' },
      })
    )
    uploadId = multipartUpload.UploadId!

    const parts = []
    for (let i = 0; i < numParts; i++) {
      const start = i * MULTI_PART_UPLOAD_CHUNK_SIZE
      const end = Math.min(start + MULTI_PART_UPLOAD_CHUNK_SIZE, fileSize)
      const chunk = await readFileChunk(filePath, start, end)

      let attempt = 0
      while (attempt < UPLOAD_MAX_RETRIES) {
        try {
          const response = await s3Client.send(
            new UploadPartCommand({
              Bucket: process.env.AWS_S3_BUCKET_NAME!,
              Key: key,
              UploadId: uploadId,
              PartNumber: i + 1,
              Body: chunk,
            })
          )

          parts.push({
            ETag: response.ETag!,
            PartNumber: i + 1,
          })
          break
        } catch (error) {
          attempt++
          if (attempt === UPLOAD_MAX_RETRIES) throw error
          await delay(1000 * attempt)
        }
      }
    }

    await s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    )
  } catch (error) {
    if (uploadId) {
      try {
        await s3Client.send(
          new AbortMultipartUploadCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
            UploadId: uploadId,
          })
        )
      } catch (abortError) {
        logger.error(
          `[${originalFileKey}] Failed to abort multipart upload for ${key}: ${abortError}`
        )
      }
    }
    throw error
  }
}

async function uploadToS3(
  filePath: string,
  key: string,
  originalFileKey: string
): Promise<void> {
  const stats = await fs.promises.stat(filePath)
  const fileSize = stats.size

  try {
    if (fileSize <= SINGLE_PART_UPLOAD_LIMIT) {
      await singlePartUpload(filePath, key)
    } else {
      await multiPartUpload(filePath, key, fileSize, originalFileKey)
    }
  } catch (error) {
    logger.error(
      `[${originalFileKey}] Failed to upload file to S3: ${key} - ${error}`
    )
    throw new Error(`Failed to upload converted file to S3: ${key}`)
  }
}

async function deleteFromS3(
  key: string,
  originalFileKey: string
): Promise<void> {
  try {
    const deleteObjectCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    })
    await s3Client.send(deleteObjectCommand)
  } catch (error) {
    logger.error(
      `[${originalFileKey}] Failed to delete file from S3: ${key} - ${error}`
    )
  }
}

async function generateWaveform(
  mp3Path: string,
  fileId: string,
  fileKey: string
): Promise<{ success: boolean; error?: string }> {
  const waveformKey = `${fileId}_wf.png`
  const wavPath = storageHandler.getFilePath(`${fileId}.wav`)
  const waveformPath = storageHandler.getFilePath(`${fileId}_wf.png`)

  for (
    let attempt = 1;
    attempt <= CONVERSION_RETRY_CONFIG.maxAttempts;
    attempt++
  ) {
    try {
      logger.info(`[${fileKey}] Generating waveform - attempt ${attempt}`)

      await new Promise<void>((resolve, reject) => {
        ffmpeg(mp3Path)
          .outputFormat('wav')
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .save(wavPath)
      })

      await execPromise(
        `waveformgen -d 2500x60 -t -p 808080 -m "${wavPath}" "${waveformPath}"`
      )

      await uploadToS3(waveformPath, waveformKey, fileKey)

      logger.info(
        `[${fileKey}] Successfully generated waveform on attempt ${attempt}`
      )
      return { success: true }
    } catch (error) {
      logger.error(
        `[${fileKey}] Error generating waveform on attempt ${attempt}: ${error}`
      )

      if (attempt === CONVERSION_RETRY_CONFIG.maxAttempts) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }

      const backoffDelay = calculateBackoffDelay(attempt)
      logger.info(
        `[${fileKey}] Retrying waveform generation in ${
          backoffDelay / 1000
        } seconds`
      )
      await delay(backoffDelay)
    } finally {
      await storageHandler.deleteFile(wavPath, fileKey).catch(() => {})
      await storageHandler.deleteFile(waveformPath, fileKey).catch(() => {})
    }
  }

  return {
    success: false,
    error: `Failed to generate waveform after ${CONVERSION_RETRY_CONFIG.maxAttempts} attempts`,
  }
}

async function getMetadataWithFFmpeg(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(
      filePath,
      (err: Error | null, metadata: ffmpeg.FfprobeData) => {
        if (err) {
          return reject(new Error('Invalid file'))
        }

        const duration = metadata.format.duration as number
        if (!duration) {
          return reject(new Error('Duration not found'))
        }

        resolve(duration)
      }
    )
  })
}

function isRetryableError(error: FFmpegError): boolean {
  if (error.signal === ProcessSignal.OUT_OF_MEMORY) return true

  if (error.exitCode !== undefined) {
    switch (error.exitCode) {
      // Retryable exit codes
      case FFmpegExitCode.MEMORY_ERROR:
      case FFmpegExitCode.SYSTEM_ERROR:
      case FFmpegExitCode.PROTOCOL_ERROR:
        return true

      // Non-retryable exit codes
      case FFmpegExitCode.MISSING_ARGUMENT:
      case FFmpegExitCode.INVALID_OPTION:
      case FFmpegExitCode.CODEC_NOT_FOUND:
      case FFmpegExitCode.PERMISSION_DENIED:
      case FFmpegExitCode.INVALID_INPUT:
      case FFmpegExitCode.FILE_NOT_FOUND:
        return false

      // Generic errors need additional analysis
      case FFmpegExitCode.GENERIC_ERROR:
        break
    }
  }

  if (error.code) {
    switch (error.code) {
      // System error codes that are retryable
      case 'EBUSY':
      case 'ETIMEDOUT':
      case 'ECONNRESET':
      case 'EPIPE':
      case 'EAGAIN':
      case 'ENOSPC':
        return true

      // Non-retryable system error codes
      case 'ENOENT':
      case 'EACCES':
      case 'EPERM':
      case 'EINVAL':
      case 'EBADF':
        return false
    }
  }

  if (error.stderr) {
    // Memory-related errors in stderr
    if (
      error.stderr.includes('Cannot allocate memory') ||
      error.stderr.includes('Out of memory')
    ) {
      return true
    }

    // Corrupted input errors
    if (
      error.stderr.includes('Invalid data found') ||
      error.stderr.includes('Error while decoding')
    ) {
      return false
    }
  }

  return false
}

async function convertFile(
  input: string,
  output: string,
  format: 'mp3' | 'mp4',
  fileKey: string
): Promise<void> {
  let lastError: Error | undefined

  for (
    let attempt = 1;
    attempt <= CONVERSION_RETRY_CONFIG.maxAttempts;
    attempt++
  ) {
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg.ffprobe(input, (err, metadata) => {
          if (err) return reject(err)

          const videoStream = metadata.streams.find(
            (stream) => stream.codec_type === 'video'
          )
          const audioStream = metadata.streams.find(
            (stream) => stream.codec_type === 'audio'
          )
          const mediaInfo = {
            videoCodec: videoStream?.codec_name?.toLowerCase() || null,
            audioChannels: audioStream?.channels || null,
          }

          let command = ffmpeg(input)

          if (format === 'mp4') {
            const isH264 =
              mediaInfo.videoCodec &&
              ['h264', 'avc', 'avc1'].includes(mediaInfo.videoCodec)

            if (isH264) {
              command = command
                .outputFormat('mp4')
                .outputOptions([
                  '-c:v',
                  'copy',
                  '-c:a',
                  'aac',
                  '-strict',
                  'experimental',
                ])
            } else {
              command = command
                .outputFormat('mp4')
                .videoCodec('libx264')
                .outputOptions(['-crf', '19', '-strict', 'experimental'])
            }
          } else if (format === 'mp3') {
            command = command
              .outputFormat('mp3')
              .audioCodec('libmp3lame')
              .outputOptions(['-ar', '44100', '-b:a', '128k'])

            if (mediaInfo.audioChannels && mediaInfo.audioChannels > 2) {
              command.outputOptions(['-ac', '2'])
            }
          }

          command
            .on('start', () => {
              logger.info(
                `[${fileKey}] Starting ${format} conversion attempt ${attempt}`
              )
            })
            .on('end', () => {
              logger.info(
                `[${fileKey}] ${format} conversion attempt ${attempt} completed successfully`
              )
              resolve()
            })
            .on('error', (err: FFmpegError, stdout, stderr) => {
              logger.error(
                `[${fileKey}] ${format} conversion attempt ${attempt} failed: ${err.message}`
              )
              err.stderr = stderr ?? undefined
              reject(err)
            })
            .save(output)
        })
      })

      return
    } catch (error) {
      lastError = error as Error
      if (!isRetryableError(lastError)) {
        logger.error(
          `[${fileKey}] Non-retryable error encountered: ${lastError}`
        )
        throw new Error(
          `Conversion failed: ${lastError.message} (Error not retryable)`
        )
      }

      if (attempt === CONVERSION_RETRY_CONFIG.maxAttempts) {
        throw new Error(
          `File conversion to ${format} failed after ${CONVERSION_RETRY_CONFIG.maxAttempts} attempts. Final error: ${error}`
        )
      }

      const backoffDelay = calculateBackoffDelay(attempt)
      logger.error(
        `[${fileKey}] File conversion to ${format} attempt ${attempt} failed. Retrying in ${
          backoffDelay / 1000
        } seconds. Error: ${error}`
      )
      await delay(backoffDelay)
    }
  }

  throw lastError
}

async function convertToMp3Mp4(
  filePath: string,
  fileKey: string,
  fileId: string
): Promise<number> {
  const fileExt = path.extname(fileKey).toLowerCase()
  const mp3Key = `${fileId}.mp3`
  const mp4Key = `${fileId}.mp4`
  const mp3Path = storageHandler.getFilePath(mp3Key)
  const mp4Path = storageHandler.getFilePath(mp4Key)

  const isVideoFile = VIDEO_EXTENSIONS.includes(fileExt)
  let mp3Created = false
  let mp4Created = false
  let mp3Uploaded = false
  let mp4Uploaded = false
  let waveformResult = { success: false }

  try {
    const conversionPromises = []

    conversionPromises.push(
      convertFile(filePath, mp3Path, 'mp3', fileKey).then(async () => {
        mp3Created = true
        try {
          await uploadToS3(mp3Path, mp3Key, fileKey)
          mp3Uploaded = true

          waveformResult = await generateWaveform(mp3Path, fileId, fileKey)
          if (!waveformResult.success) {
            logger.info(
              `[${fileKey}] Waveform generation failed but continuing with conversion`
            )
          }
        } catch (error) {
          logger.error(
            `[${fileKey}] Failed to upload MP3 for ${fileId}: ${error}`
          )
          await storageHandler.deleteFile(mp3Path, fileKey)
          throw error
        }
      })
    )

    if (isVideoFile) {
      conversionPromises.push(
        convertFile(filePath, mp4Path, 'mp4', fileKey).then(async () => {
          mp4Created = true
          try {
            await uploadToS3(mp4Path, mp4Key, fileKey)
            mp4Uploaded = true
          } catch (error) {
            logger.error(
              `[${fileKey}] Failed to upload MP4 for ${fileId}: ${error}`
            )
            await storageHandler.deleteFile(mp4Path, fileKey)
            throw error
          }
        })
      )
    }

    await Promise.all(conversionPromises)
    const duration = Math.floor(
      Number(((await getMetadataWithFFmpeg(mp3Path)) ?? 0).toFixed(2))
    )

    return duration
  } catch (error) {
    logger.error(`[${fileKey}] Conversion failed for file ${fileId}: ${error}`)

    if (mp3Uploaded) await deleteFromS3(mp3Key, fileKey)
    if (mp4Uploaded) await deleteFromS3(mp4Key, fileKey)

    throw error
  } finally {
    const cleanup = async () => {
      if (mp3Created) await storageHandler.deleteFile(mp3Path, fileKey)
      if (mp4Created) await storageHandler.deleteFile(mp4Path, fileKey)
    }

    await cleanup().catch((error) =>
      logger.error(
        `[${fileKey}] Error during final cleanup for ${fileId}: ${error}`
      )
    )
  }
}

export async function convertAudioVideo(
  userId: string,
  fileId: string,
  fileKey: string
): Promise<ConversionResult> {
  logger.info(`[${fileKey}] Starting processing for file`)

  let downloadedFilePath: string | null = null
  let conversionError: Error | null = null

  try {
    downloadedFilePath = await downloadFromS3(fileKey)
    if (!downloadedFilePath) {
      throw new Error('Failed to download file from S3')
    }

    let duration
    try {
      duration = await convertToMp3Mp4(downloadedFilePath, fileKey, fileId)
    } catch (error) {
      conversionError = error as Error
      throw error
    }

    logger.info(`[${fileKey}] Processing completed`)

    return {
      status: 'SUCCESS',
      userId,
      fileId,
      duration,
    }
  } catch (error) {
    logger.error(`[${fileKey}] Error processing file: ${error}`)

    if (conversionError) {
      return {
        status: 'ERROR',
        userId,
        fileId,
        error: (error as Error).message,
      }
    }

    throw error
  } finally {
    if (downloadedFilePath) {
      try {
        await storageHandler.deleteFile(downloadedFilePath, fileKey)
      } catch (error) {
        logger.error(
          `[${fileKey}] Final attempt to clean up downloaded file ${downloadedFilePath} failed: ${error}`
        )
      }
    }
  }
}
