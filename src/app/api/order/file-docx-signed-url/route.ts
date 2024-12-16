export const dynamic = 'force-dynamic'
import { FileTag } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url)
        const fileId = url.searchParams.get('fileId') as string
        const docType = url.searchParams.get('docType')
        const userToken = req.headers.get('x-user-token')
        const user = JSON.parse(userToken ?? '{}')
        const userId = user.internalTeamUserId ?? user?.userId

        if (docType === "CUSTOM_FORMATTING_DOC") {
            const fileVersion = await prisma.fileVersion.findFirst({
                where: {
                    fileId,
                    tag: FileTag.CF_CUSTOMER_DELIVERED,
                    userId
                },
                orderBy: {
                    updatedAt: 'desc',
                },
            })

            if (!fileVersion?.s3VersionId) {
                logger.error(`File versiona not found for ${fileId}`)
                return NextResponse.json({ success: false, message: 'File version not found' }, { status: 404 })
            }

            const file = await prisma.file.findUnique({
                where: {
                    fileId: fileId,
                },
                select: {
                    filename: true
                }
            })

            const signedUrl = await getFileVersionSignedURLFromS3(`${fileId}.docx`, fileVersion?.s3VersionId, 900, `${file?.filename}.docx`)

            return NextResponse.json({
                message: 'Downloaded Successfully',
                signedUrl,
            })
        }
    } catch (error) {
        logger.error(`Failed to send docx file ${error}`)
        return NextResponse.json({
            success: false,
            message: 'An error occurred. Please try again after some time.',
        }, { status: 500 })
    }
}
