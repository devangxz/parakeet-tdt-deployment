import { OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { WORKER_QUEUE_NAMES, workerQueueService } from '@/services/worker-service'
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
            logger.error(`No pending files found`)
            return NextResponse.json({
                success: false,
                message: 'No pending files found',
            })
        }

        for (const file of pendingFiles) {
            const fileRecord = await prisma.file.findUnique({
                where: { fileId: file.fileId },
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

            const fileExists = await fileExistsInS3(`${file.fileId}.mp3`)

            if (fileRecord?.converted) {
                if (fileExists) {
                    await workerQueueService.createJob(WORKER_QUEUE_NAMES.AUTOMATIC_SPEECH_RECOGNITION, {
                        fileId: file.fileId
                    })
                } else {
                    await workerQueueService.createJob(WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION, {
                        fileKey: fileRecord?.fileKey,
                        userEmailId: fileRecord?.user?.email,
                        fileId: file.fileId
                    })
                    logger.info(`Triggered conversion retry for file ${file.fileId} - fileKey: ${fileRecord?.fileKey}, userEmail: ${fileRecord?.user?.email}`)

                    const awsSes = getAWSSesInstance();
                    await awsSes.sendAlert(
                        `File Conversion Retry Triggered`,
                        `Conversion missing for file ${fileRecord.fileKey} uploaded by ${fileRecord.user?.email}. Triggered reconversion.`,
                        'software'
                    )
                }
            }
        }

        logger.info(`Triggered ASR for ${pendingFiles.length} pending files`)
        return NextResponse.json({
            success: true,
            message: 'Successfully triggered ASR',
        })

    } catch (error) {
        logger.error(`Error triggering asr for pending files ${error}`)
        return NextResponse.json({
            success: false,
            message: 'Error triggering asr for pending files',
        })
    }
}
