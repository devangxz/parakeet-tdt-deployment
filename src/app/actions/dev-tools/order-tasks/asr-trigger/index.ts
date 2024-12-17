'use server'

import logger from '@/lib/logger'
import {
  WORKER_QUEUE_NAMES,
  workerQueueService,
} from '@/services/worker-service'
import { fileExistsInS3 } from '@/utils/backend-helper'

export async function triggerASR(fileId: string) {
  try {
    if (!fileId) {
      return {
        success: false,
        message: 'File ID is required',
      }
    }

    const fileExists = await fileExistsInS3(`${fileId}.mp3`)
    if (fileExists) {
      await workerQueueService.createJob(
        WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION,
        { fileId }
      )
    } else {
      logger.error(
        `file ${fileId}.mp3 does not exist in s3, not creating an ASR job`
      )
      return {
        success: false,
        message: 'File does not exist in S3',
      }
    }

    return {
      success: true,
      message: 'ASR triggered successfully',
    }
  } catch (error) {
    console.error('Error triggering ASR:', error)
    return {
      success: false,
      message: 'Failed to trigger ASR',
    }
  }
}
