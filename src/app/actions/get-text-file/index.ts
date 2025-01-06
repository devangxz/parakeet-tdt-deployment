'use server'

import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function getTextFile(fileId: string, type: string) {
    try {
        const fileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId,
                tag: type === 'QC' ? FileTag.QC_DELIVERED : type === 'LLM' ? FileTag.LLM : FileTag.AUTO,
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })

        if (!fileVersion?.s3VersionId) {
            logger.error(`File version not found for ${fileId}`)
            throw new Error('File version not found')
        }

        const signedUrl = await getFileVersionSignedURLFromS3(`${fileId}.txt`, fileVersion?.s3VersionId)
        logger.info(`signed URL generated successfully for file ${fileId}`)

        return {
            success: true,
            signedUrl,
        }

    } catch (error) {
        logger.error(`Error fetching signed url from S3: ${error}`)
        return {
            success: false,
            message: 'Error fetching signed url from S3'
        }
    }
}