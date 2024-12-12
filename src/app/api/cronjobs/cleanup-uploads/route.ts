import { ListMultipartUploadsCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { s3Client } from '@/lib/s3Client'

export async function POST() {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME
        if (!bucketName) {
            throw new Error('AWS bucket name not configured')
        }

        const listCommand = new ListMultipartUploadsCommand({
            Bucket: bucketName
        })

        const { Uploads = [] } = await s3Client.send(listCommand)

        if (Uploads.length === 0) {
            logger.info('No incomplete multipart uploads found in S3')
            return NextResponse.json({
                success: true,
                message: 'No incomplete uploads to clean',
                cleanedCount: 0
            })
        }

        let cleanedCount = 0
        const sevenDaysAgo = new Date()
        const deletedUploadIds = new Set<string>()

        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        for (const upload of Uploads) {
            if (upload.Initiated && upload.Initiated < sevenDaysAgo) {
                try {
                    const abortCommand = new AbortMultipartUploadCommand({
                        Bucket: bucketName,
                        Key: upload.Key,
                        UploadId: upload.UploadId
                    })

                    await s3Client.send(abortCommand)
                    cleanedCount++

                    if (upload.UploadId) {
                        deletedUploadIds.add(upload.UploadId)
                    }

                    logger.info(`Aborted multipart upload: ${upload.Key} (UploadId: ${upload.UploadId}, InitiatedDate: ${upload.Initiated})`)
                } catch (error) {
                    logger.error(`Failed to abort upload ${upload.Key}: ${error}`)
                    continue
                }
            }
        }

        if (deletedUploadIds.size > 0) {
            await prisma.uploadSession.deleteMany({
                where: {
                    uploadId: {
                        in: Array.from(deletedUploadIds)
                    }
                }
            })
        }

        logger.info(`Cleaned up ${cleanedCount} incomplete multipart uploads`)
        return NextResponse.json({
            success: true,
            message: `Successfully cleaned up ${cleanedCount} incomplete uploads`,
            cleanedCount
        })

    } catch (error) {
        logger.error(`Error cleaning up multipart uploads: ${error}`)
        return NextResponse.json({
            success: false,
            message: 'Error cleaning up incomplete multipart uploads'
        }, { status: 500 })
    }
}