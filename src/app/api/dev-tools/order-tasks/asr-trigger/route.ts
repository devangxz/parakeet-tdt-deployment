import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import {
  WORKER_QUEUE_NAMES,
  workerQueueService,
} from '@/services/worker-service'
import { fileExistsInS3 } from '@/utils/backend-helper'

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'File does not exist in S3' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'ASR triggered successfully',
    })
  } catch (error) {
    console.error('Error triggering ASR:', error)
    return NextResponse.json(
      { error: 'Failed to trigger ASR' },
      { status: 500 }
    )
  }
}
