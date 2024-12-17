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

        const file = await prisma.file.findFirst({
            where: {
                fileId: fileId
            }
        })

        if (!file) {
            return NextResponse.json({ message: 'File not found' }, { status: 404 })
        }

        let fileVersion = ''

        const customerEditFileVersion = await prisma.fileVersion.findFirst({
            where: {
                fileId: fileId,
                tag: FileTag.CUSTOMER_EDIT,
            },
            select: {
                s3VersionId: true
            },
        })

        if (!customerEditFileVersion || !customerEditFileVersion.s3VersionId) {
            const customerDeliveredFileVersion = await prisma.fileVersion.findFirst({
                where: {
                    fileId: fileId,
                    tag: FileTag.CUSTOMER_DELIVERED,
                },
                select: {
                    s3VersionId: true
                },
            })

            if (!customerDeliveredFileVersion || !customerDeliveredFileVersion.s3VersionId) {
                return NextResponse.json({ message: 'Transcript not found' }, { status: 404 })
            }

            fileVersion = customerDeliveredFileVersion.s3VersionId
        } else {
            fileVersion = customerEditFileVersion.s3VersionId
        }

        const signedUrl = await getFileVersionSignedURLFromS3(`${fileId}.txt`, fileVersion, 900, `${file.filename}.txt`)

        return NextResponse.json({
            url: signedUrl,
        });

    } catch (error) {
        logger.error(`Failed to send docx file ${error}`)
        return NextResponse.json({
            success: false,
            message: 'An error occurred. Please try again after some time.',
        }, { status: 500 })
    }
}
