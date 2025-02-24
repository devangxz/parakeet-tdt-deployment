'use server'

import { FileTag } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function getCustomFormatFilesSignedUrl(fileId: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId
    const fileVersion = await prisma.fileVersion.findMany({
      where: {
        fileId,
        tag: FileTag.CF_CUSTOMER_DELIVERED,
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!fileVersion) {
      logger.error(`File version not found for ${fileId}`)
      return {
        success: false,
        message: 'File version not found',
      }
    }

    const file = await prisma.file.findUnique({
      where: {
        fileId: fileId,
      },
      select: {
        filename: true,
      },
    })

    const signedUrls = await Promise.all(
      fileVersion.map(async (version) => {
        const signedUrl = await getFileVersionSignedURLFromS3(
          `${fileId}.${version.extension ?? 'docx'}`,
          version.s3VersionId || '',
          900,
          `${file?.filename}.${version.extension ?? 'docx'}`
        )
        return {
          signedUrl,
          filename: file?.filename || '',
          extension: version.extension || 'docx',
        }
      })
    )

    return {
      success: true,
      signedUrls,
    }
  } catch (error) {
    logger.error(`Failed to send custom format files ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
