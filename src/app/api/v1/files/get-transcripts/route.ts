import { FileTag } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const fileId = req.nextUrl.searchParams.get('fileId')
    if (!fileId) {
      return NextResponse.json(
        { message: 'File ID is required' },
        { status: 400 }
      )
    }

    const fileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.CF_CUSTOMER_DELIVERED,
        userId: user.userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!fileVersion?.s3VersionId) {
      logger.error(`File versiona not found for ${fileId}`)
      return NextResponse.json(
        { message: 'File version not found' },
        { status: 404 }
      )
    }

    const file = await prisma.file.findUnique({
      where: {
        fileId: fileId,
      },
      select: {
        filename: true,
      },
    })

    const signedUrl = await getFileVersionSignedURLFromS3(
      `${fileId}.docx`,
      fileVersion?.s3VersionId,
      900,
      `${file?.filename}.docx`
    )

    logger.info(`Transcript fetched successfully for file ${fileId}`)

    return NextResponse.json(signedUrl)
  } catch (error) {
    logger.error('Error fetching transcript:', error)
    return NextResponse.json(
      { message: 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}
