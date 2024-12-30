'use server'

import { FileTag, OrderStatus, OrderType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function downloadBlankDocxAction(
    fileId: string,
    type: string,
) {
    try {
        logger.info(
            `--> downloadBlankDocx ${fileId} ${type}`
        )

        if (!fileId || !type) {
            return {
                success: false,
                error: 'Missing required parameters'
            }
        }

        const order = await prisma.order.findUnique({
            where: {
                fileId,
            },
        })

        if (!order) {
            logger.error(`Order not found for ${fileId}`)
            return {
                success: false,
                error: `Order not found for ${fileId}`
            }
        }

        if (order.status === OrderStatus.FINALIZER_ASSIGNED) {
            const fileVersion = await prisma.fileVersion.findFirst({
                where: {
                    fileId,
                    tag: FileTag.CF_REV_SUBMITTED,
                },
                select: {
                    s3VersionId: true,
                },
                orderBy: {
                    createdAt: 'desc'
                }
            })

            if (!fileVersion || !fileVersion.s3VersionId) {
                logger.error(`File version not found for ${fileId}`)
                return {
                    success: false,
                    error: 'File version not found'
                }
            }

            const signedUrl = await getFileVersionSignedURLFromS3(
                `${fileId}.docx`,
                fileVersion?.s3VersionId
            )

            return {
                success: true,
                url: signedUrl
            }

        } else if (
            order.status === OrderStatus.PRE_DELIVERED &&
            order.orderType === OrderType.TRANSCRIPTION_FORMATTING
        ) {
            const fileVersion = await prisma.fileVersion.findFirst({
                where: {
                    fileId,
                    tag: FileTag.CF_FINALIZER_SUBMITTED,
                },
                select: {
                    s3VersionId: true,
                },
            })

            if (!fileVersion || !fileVersion.s3VersionId) {
                logger.error(`File version not found for ${fileId}`)
                return {
                    success: false,
                    error: 'File version not found'
                }
            }

            const signedUrl = await getFileVersionSignedURLFromS3(
                `${fileId}.docx`,
                fileVersion?.s3VersionId
            )

            return {
                success: true,
                url: signedUrl
            }
        }

        return {
            success: false,
            error: 'Invalid order status or type'
        }

    } catch (error) {
        logger.error(`error downloading file for file ${fileId}: ${error}`)
        return {
            success: false,
            error: 'Failed to generate blank docx'
        }
    }
}