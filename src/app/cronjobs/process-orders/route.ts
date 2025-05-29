import { OrderStatus, ReportMode } from '@prisma/client'
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
    const pendingFiles = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
      },
      select: {
        fileId: true,
      },
    })
    if (pendingFiles.length === 0) {
      logger.info('No pending files found in the system')
      return NextResponse.json({
        success: false,
        message: 'No pending files found',
      })
    }

    logger.info(`Processing ${pendingFiles.length} pending files`)

    for (const file of pendingFiles) {
      logger.info(`Processing file: ${file?.fileId}`)

      const fileRecord = await prisma.file.findUnique({
        where: { fileId: file?.fileId },
        select: {
          converted: true,
          fileKey: true,
          userId: true,
          uploadedBy: true,
          reportOption: true,
          reportComment: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      })

      if (fileRecord?.reportOption) {
        logger.info(
          `[${file?.fileId}] Screening file with reason: ${fileRecord?.reportOption} - ${fileRecord?.reportComment}`
        )

        await prisma.order.update({
          where: { fileId: file?.fileId },
          data: {
            reportMode: ReportMode.AUTO,
            reportOption: fileRecord?.reportOption,
            reportComment: fileRecord?.reportComment,
            status: OrderStatus.SUBMITTED_FOR_SCREENING,
          },
        })
        continue
      }

      const youtubeFile = await prisma.youTubeFile.findUnique({
        where: { fileId: file?.fileId },
        select: {
          isImported: true,
          youtubeUrl: true,
        },
      })

      if (youtubeFile && youtubeFile?.isImported === null) {
        logger.info(`Sending YouTube file ${file?.fileId} details to support`)

        const awsSes = getAWSSesInstance()
        await awsSes.sendAlert(
          `YouTube File Import Required`,
          `Please import the following YouTube file - File ID: ${file?.fileId}, YouTube URL: ${youtubeFile?.youtubeUrl}, User ID: ${fileRecord?.uploadedBy}, Team User ID: ${fileRecord?.userId}, User Email ID: ${fileRecord?.user?.email}.`,
          'software'
        )

        logger.info(
          `Successfully sent YouTube file ${file?.fileId} details to support - URL: ${youtubeFile?.youtubeUrl}, userID: ${fileRecord?.uploadedBy}, teamUserID: ${fileRecord?.userId}`
        )
        continue
      }

      if (youtubeFile && youtubeFile?.isImported === true) {
        const fileExists = await fileExistsInS3(`${fileRecord?.fileKey}`)

        if (!fileExists) continue
      }

      if (!fileRecord?.converted) {
        logger.info(
          `Checking if file ${file?.fileId} exists in conversion queue`
        )
        const isInConversionQueue = await workerQueueService.hasExistingJob(
          WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
          file?.fileId
        )
        logger.info(
          `File ${file?.fileId} exists in conversion queue: ${isInConversionQueue}`
        )

        if (!isInConversionQueue) {
          logger.info(`Adding file ${file?.fileId} to conversion queue`)

          await workerQueueService.createJob(
            WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
            {
              userId: fileRecord?.uploadedBy,
              fileId: file?.fileId,
              fileKey: fileRecord?.fileKey,
            }
          )

          if (youtubeFile) {
            logger.info(
              `Triggered conversion for YouTube file ${file?.fileId} - fileKey: ${fileRecord?.fileKey}, userID: ${fileRecord?.uploadedBy}, teamUserID: ${fileRecord?.userId}, userEmailId: ${fileRecord?.user?.email}`
            )
          } else {
            logger.info(
              `Triggered conversion retry for file ${file?.fileId} - fileKey: ${fileRecord?.fileKey}, userID: ${fileRecord?.uploadedBy}, teamUserID: ${fileRecord?.userId}, userEmailId: ${fileRecord?.user?.email}`
            )

            const awsSes = getAWSSesInstance()
            await awsSes.sendAlert(
              `File Conversion Retry Triggered`,
              `Conversion missing for file ${file?.fileId}, Triggered reconversion. File ID: ${file?.fileId}, File Key: ${fileRecord?.fileKey}, User ID: ${fileRecord?.uploadedBy}, Team User ID: ${fileRecord?.userId}, User Email ID: ${fileRecord?.user?.email}.`,
              'software'
            )
          }
        } else {
          logger.info(`File ${file?.fileId} already in conversion queue`)
        }
        continue
      }

      if (fileRecord?.converted) {
        const fileExists = await fileExistsInS3(`${file?.fileId}.mp3`)
        if (!fileExists) {
          logger.info(
            `Converted file ${file?.fileId} not found in S3, triggering reconversion`
          )

          logger.info(
            `Checking if file ${file?.fileId} exists in conversion queue`
          )
          const isInConversionQueue = await workerQueueService.hasExistingJob(
            WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
            file?.fileId
          )
          logger.info(
            `File ${file?.fileId} exists in conversion queue: ${isInConversionQueue}`
          )

          if (!isInConversionQueue) {
            await workerQueueService.createJob(
              WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
              {
                userId: fileRecord?.uploadedBy,
                fileId: file?.fileId,
                fileKey: fileRecord?.fileKey,
              }
            )

            logger.info(
              `Triggered conversion retry for file ${file?.fileId} - fileKey: ${fileRecord?.fileKey}, userID: ${fileRecord?.uploadedBy}, teamUserID: ${fileRecord?.userId}, userEmailId: ${fileRecord?.user?.email}`
            )

            const awsSes = getAWSSesInstance()
            await awsSes.sendAlert(
              `File Conversion Retry Triggered`,
              `Conversion missing for file ${file?.fileId}, Triggered reconversion. File ID: ${file?.fileId}, File Key: ${fileRecord?.fileKey}, User ID: ${fileRecord?.uploadedBy}, Team User ID: ${fileRecord?.userId}, User Email ID: ${fileRecord?.user?.email}.`,
              'software'
            )
          } else {
            logger.info(`File ${file?.fileId} already in conversion queue`)
          }
          continue
        }

        logger.info(`Checking if file ${file?.fileId} exists in ASR queue`)
        const isInASRQueue = await workerQueueService.hasExistingJob(
          WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION,
          file?.fileId
        )
        logger.info(`File ${file?.fileId} exists in ASR queue: ${isInASRQueue}`)

        if (!isInASRQueue) {
          logger.info(`Adding file ${file?.fileId} to ASR queue`)

          await workerQueueService.createJob(
            WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION,
            {
              fileId: file?.fileId,
            }
          )
          logger.info(
            `Successfully added file ${file?.fileId} to ASR queue - fileKey: ${fileRecord?.fileKey}, userID: ${fileRecord?.uploadedBy}, teamUserID: ${fileRecord?.userId}`
          )
        } else {
          logger.info(`File ${file?.fileId} already in ASR queue`)
        }
      }
    }

    logger.info(
      `File processing cycle completed successfully - processed ${pendingFiles.length} files`
    )
    return NextResponse.json({
      success: true,
      message: `Successfully processed ${pendingFiles.length} pending files`,
    })
  } catch (error) {
    logger.error(`Error processing pending files: ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Error processing pending files',
    })
  }
}
