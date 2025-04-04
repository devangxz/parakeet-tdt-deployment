'use server'

import { FileTag } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function getCustomFormatFilesSignedUrl(
  fileId: string,
  isReviewerSubmitted = false,
  isFinalizerSubmitted = false,
  isDotComOrder = false
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (isDotComOrder) {
      const files = await prisma.miscJobsAttachments.findMany({
        where: {
          OR: [{ fileId: fileId }, { fileId: { contains: fileId } }],
        },
      })

      const signedUrls = await Promise.all(
        files.map(async (file) => {
          const extension = file.fileExtension || 'docx'

          const signedUrl = await getFileVersionSignedURLFromS3(
            `${file.filename}.${extension}`,
            '',
            900,
            `${file?.originalFilename}.${extension}`,
            file.s3Bucket
          )

          return {
            signedUrl,
            filename: file?.originalFilename || '',
            extension,
          }
        })
      )

      return {
        success: true,
        signedUrls,
      }
    }

    const whereClause: {
      fileId: string
      tag: FileTag
      userId?: number
    } = {
      fileId,
      tag: isReviewerSubmitted
        ? FileTag.CF_REV_SUBMITTED
        : isFinalizerSubmitted
        ? FileTag.CF_FINALIZER_SUBMITTED
        : FileTag.CF_CUSTOMER_DELIVERED,
    }

    if (!isReviewerSubmitted && !isFinalizerSubmitted && userId) {
      whereClause.userId = userId
    }

    const fileVersions = await prisma.fileVersion.findMany({
      where: whereClause,
    })

    if (!fileVersions || fileVersions.length === 0) {
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
      fileVersions.map(async (version) => {
        const extension = version.extension || 'docx'

        const signedUrl = await getFileVersionSignedURLFromS3(
          version.s3Key || '',
          version.s3VersionId || '',
          900,
          `${file?.filename}.${extension}`
        )

        return {
          signedUrl,
          filename: file?.filename || '',
          extension,
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
