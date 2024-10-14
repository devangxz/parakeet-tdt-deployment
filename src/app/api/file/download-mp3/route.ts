export const dynamic = 'force-dynamic'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import s3Client from '@/lib/s3-client'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get('parentId')
  try {
    if (!fileId) {
      logger.error('File id is required')
      return NextResponse.json(
        { success: false, message: 'File Id is required' },
        { status: 400 }
      )
    }

    const file = await prisma.file.findUnique({
      where: { fileId },
    })

    if (!file) {
      logger.error(`File with ID ${fileId} not found`)
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      )
    }

    const encodedFilename = encodeURIComponent(file.filename ?? '')
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${fileId}.mp3`,
      ResponseContentDisposition: `attachment; filename=${encodedFilename}`,
    })

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900,
    })

    const response = NextResponse.json({ success: true, url: signedUrl })
    return response
  } catch (error) {
    logger.error(`An error occurred while downloading mp3 ${fileId}: ${error}`)
    return NextResponse.json(
      { success: false, message: 'Failed to download mp3' },
      { status: 500 }
    )
  }
}
