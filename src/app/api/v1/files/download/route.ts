export const dynamic = 'force-dynamic'
import { FileTag } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    const user = await authenticateRequest(req as NextRequest)

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!fileId) {
      return NextResponse.json(
        { message: 'File Id is required' },
        { status: 400 }
      )
    }

    const file = await prisma.file.findFirst({
      where: {
        fileId: fileId,
      },
    })

    if (!file) {
      return NextResponse.json({
        success: false,
        message: 'File not found',
      })
    }

    let fileVersion = ''

    const customerEditFileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId: fileId,
        tag: FileTag.CUSTOMER_EDIT,
      },
      select: {
        s3VersionId: true,
      },
    })

    if (!customerEditFileVersion || !customerEditFileVersion.s3VersionId) {
      const customerDeliveredFileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId: fileId,
          tag: FileTag.CUSTOMER_DELIVERED,
        },
        select: {
          s3VersionId: true,
        },
      })

      if (
        !customerDeliveredFileVersion ||
        !customerDeliveredFileVersion.s3VersionId
      ) {
        return NextResponse.json({
          success: false,
          message: 'Transcript not found',
        })
      }

      fileVersion = customerDeliveredFileVersion.s3VersionId
    } else {
      fileVersion = customerEditFileVersion.s3VersionId
    }

    const signedUrl = await getFileVersionSignedURLFromS3(
      `${fileId}.txt`,
      fileVersion,
      900,
      `${file.filename}.txt`
    )

    return NextResponse.json({
      success: true,
      message: 'Downloaded Successfully',
      signedUrl,
    })
  } catch (error) {
    logger.error(`Failed to send txt file ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
