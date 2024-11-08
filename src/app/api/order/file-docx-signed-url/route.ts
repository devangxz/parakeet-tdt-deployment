export const dynamic = 'force-dynamic'
import { FileTag } from '@prisma/client'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
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

            const signedUrl = await getFileVersionSignedURLFromS3(`${fileId}.docx`, fileVersion?.s3VersionId, 900, file?.filename)

            return NextResponse.json({
                message: 'Downloaded Successfully',
                signedUrl,
            })
        } else if (docType === 'TRANSCRIPTION_DOC') {
            const response = await axios.get(`${FILE_CACHE_URL}/get-tr-docx/${fileId}?type=${docType}&userId=${userId}`, {
                headers: {
                    'x-api-key': process.env.SCRIBIE_API_KEY
                },
                responseType: 'arraybuffer'
            })
            const docxbuffer = Buffer.from(response.data, 'binary')

            return new NextResponse(docxbuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': `attachment; filename="${fileId}.docx"`
                }
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
