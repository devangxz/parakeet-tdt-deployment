'use server'

import { FileTag } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function getFileDocxSignedUrl(
    fileId: string,
    docType: string,
) {
    try {

        const session = await getServerSession(authOptions)
        const user = session?.user
        const userId = user?.internalTeamUserId || user?.userId

        if (docType === "CUSTOM_FORMATTING_DOC") {
            const fileVersion = await prisma.fileVersion.findFirst({
                where: {
                    fileId,
                    tag: FileTag.CF_CUSTOMER_DELIVERED,
                    userId
                },
                orderBy: {
                    createdAt: 'desc',
                },
            })

            if (!fileVersion?.s3VersionId) {
                logger.error(`File version not found for ${fileId}`)
                return {
                    success: false,
                    message: 'File version not found'
                }
            }

            const file = await prisma.file.findUnique({
                where: {
                    fileId: fileId,
                },
                select: {
                    filename: true
                }
            })

            const signedUrl = await getFileVersionSignedURLFromS3(
                `${fileId}.docx`,
                fileVersion?.s3VersionId,
                900,
                `${file?.filename}.docx`
            )

            return {
                success: true,
                message: 'Downloaded Successfully',
                signedUrl,
            }
        }
    } catch (error) {
        logger.error(`Failed to send docx file ${error}`)
        return {
            success: false,
            message: 'An error occurred. Please try again after some time.'
        }
    }
}
