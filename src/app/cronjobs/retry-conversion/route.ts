import { sub } from 'date-fns'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import {
  WORKER_QUEUE_NAMES,
  workerQueueService,
} from '@/services/worker-service'
import { fileExistsInS3 } from '@/utils/backend-helper'

export async function POST() {
  try {
    const oneHourAgo = sub(new Date(), { hours: 1 })

    const unprocessedFiles = await prisma.file.findMany({
      where: {
        converted: null,
        createdAt: {
          lt: oneHourAgo,
        },
      },
      select: {
        fileId: true,
        fileKey: true,
        userId: true,
        uploadedBy: true,
      },
    })

    if (unprocessedFiles.length === 0) {
      logger.info('No unprocessed files found')
      return NextResponse.json({
        success: true,
        message: 'No unprocessed files found',
      })
    }

    let processedCount = 0
    const fileIdsToMarkConverted = new Set<string>()

    for (const file of unprocessedFiles) {
      try {
        const fileExists = await fileExistsInS3(`${file?.fileId}.mp3`)
        if (fileExists) {
          logger.info(
            `Skipping file ${file?.fileId} - file already exists in S3`
          )
          fileIdsToMarkConverted.add(file?.fileId)
          continue
        }

        logger.info(`Checking if file ${file?.fileId} exists in conversion queue`)
        const hasExistingJob = await workerQueueService.hasExistingJob(
          WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
          file?.fileId
        )
        logger.info(`File ${file?.fileId} exists in conversion queue: ${hasExistingJob}`)

        if (hasExistingJob) {
          logger.info(`Skipping file ${file?.fileId} - existing job found`)
          continue
        }

        await workerQueueService.createJob(
          WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
          {
            userId: file?.uploadedBy,
            fileId: file?.fileId,
            fileKey: file?.fileKey,
          }
        )

        logger.info(
          `Triggered conversion retry for file ${file?.fileId} - fileKey: ${file?.fileKey}, userID: ${file?.uploadedBy}, teamUserID: ${file?.userId}`
        )

        const awsSes = getAWSSesInstance()
        await awsSes.sendAlert(
          `File Conversion Retry Triggered`,
          `Conversion missing for file ${file?.fileId}, Triggered reconversion. File ID: ${file?.fileId}, File Key: ${file?.fileKey}, User ID: ${file?.uploadedBy}, Team User ID: ${file?.userId}.`,
          'software'
        )

        processedCount++
      } catch (error) {
        logger.error(`Error processing file ${file?.fileId} - fileKey: ${file?.fileKey}, userID: ${file?.uploadedBy}, teamUserID: ${file?.userId}: ${error}`)
        continue
      }
    }

    if (fileIdsToMarkConverted.size > 0) {
      await prisma.file.updateMany({
        where: {
          fileId: {
            in: Array.from(fileIdsToMarkConverted),
          },
        },
        data: { converted: true },
      })
      
      logger.info(
        `Marked ${fileIdsToMarkConverted.size} files as converted in DB`
      )
    }

    logger.info(
      `Added ${processedCount} unprocessed file${
        processedCount === 1 ? '' : 's'
      } to conversion queue`
    )
    return NextResponse.json({
      success: true,
      message: `Successfully queued ${processedCount} unprocessed file${
        processedCount === 1 ? '' : 's'
      } for conversion`,
    })
  } catch (error) {
    logger.error(`Error processing unprocessed files: ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Error processing unprocessed files',
    })
  }
}
