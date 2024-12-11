import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
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

    const fileRecord = await prisma.file.findUnique({
      where: { fileId },
      select: {
        converted: true,
        fileKey: true,
        userId: true,
        user: {
          select: {
            email: true
          }
        }
      }
    })

    const fileExists = await fileExistsInS3(`${fileId}.mp3`)

    if (fileRecord?.converted) {
      if (fileExists) {
        await workerQueueService.createJob(
          WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION,
          { fileId }
        )
      } else {
        await workerQueueService.createJob(
          WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
          {
            fileKey: fileRecord.fileKey,
            userEmailId: fileRecord.user?.email,
            fileId
          }
        )
        logger.info(`Triggered conversion retry for file ${fileId} - fileKey: ${fileRecord?.fileKey}, userEmail: ${fileRecord?.user?.email}`)

        const awsSes = getAWSSesInstance();
        await awsSes.sendAlert(
            `File Conversion Retry Triggered`,
            `Conversion missing for file ${fileRecord.fileKey} uploaded by ${fileRecord.user?.email}. Triggered reconversion.`,
            'software'
        )

        logger.error(
          `File ${fileId}.mp3 does not exist in s3, not creating an ASR job`
        )
        return NextResponse.json(
          { error: 'File does not exist in S3' },
          { status: 400 }
        )
      }
    } else {
      logger.error(
        `File ${fileId}.mp3 does not exist in s3, not creating an ASR job`
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
