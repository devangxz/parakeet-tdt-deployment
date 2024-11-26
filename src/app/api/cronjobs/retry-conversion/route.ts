import { sub } from 'date-fns'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { WORKER_QUEUE_NAMES, workerQueueService } from '@/services/worker-service'

export async function POST() {
    try {
        const oneHourAgo = sub(new Date(), { hours: 1 })

        const unprocessedFiles = await prisma.file.findMany({
            where: {
                converted: null,
                createdAt: {
                    lt: oneHourAgo
                }
            },
            select: {
                fileId: true,
                fileKey: true,
                userId: true,
                createdAt: true,
                user: {
                    select: {
                        email: true
                    }
                }
            }
        })

        if (unprocessedFiles.length === 0) {
            logger.info('No unprocessed files found')
            return NextResponse.json({
                success: true,
                message: 'No unprocessed files found'
            })
        }

        let processedCount = 0

        for (const file of unprocessedFiles) {
            const hasExistingJob = await workerQueueService.hasExistingJob(
                WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
                file.fileId
            )

            if (!hasExistingJob) {
                await workerQueueService.createJob(
                    WORKER_QUEUE_NAMES.AUDIO_VIDEO_CONVERSION,
                    {
                        fileKey: file.fileKey,
                        userEmailId: file.user?.email,
                        fileId: file.fileId
                    }
                )
                logger.info(`Triggered conversion retry for file ${file.fileId} - fileKey: ${file.fileKey}, userEmail: ${file?.user?.email}`)

                const awsSes = getAWSSesInstance()
                await awsSes.sendAlert(
                    `File Conversion Retry Triggered`,
                    `Conversion missing for file ${file.fileKey} uploaded by ${file.user?.email}. Triggered reconversion.`,
                    'software'
                )

                processedCount++
            }
        }

        logger.info(`Added ${processedCount} unprocessed file${processedCount === 1 ? '' : 's'} to conversion queue`)
        return NextResponse.json({
            success: true,
            message: `Successfully queued ${processedCount} unprocessed file${processedCount === 1 ? '' : 's'} for conversion`,
        })

    } catch (error) {
        logger.error(`Error processing unprocessed files: ${error}`)
        return NextResponse.json({
            success: false,
            message: 'Error processing unprocessed files',
        })
    }
}