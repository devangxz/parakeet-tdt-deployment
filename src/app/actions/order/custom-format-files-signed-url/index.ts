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
  isFinalizerSubmitted = false
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

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
      orderBy: {
        createdAt: 'asc',
      },
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

    const versionsByExtension = new Map<string, typeof fileVersions>()

    for (const version of fileVersions) {
      const extension = version.extension || 'docx'

      if (!versionsByExtension.has(extension)) {
        versionsByExtension.set(extension, [])
      }

      versionsByExtension.get(extension)?.push(version)
    }

    const signedUrls = await Promise.all(
      fileVersions.map(async (version) => {
        const extension = version.extension || 'docx'

        const versionsOfThisExt = versionsByExtension.get(extension) || []
        const index = versionsOfThisExt.findIndex(
          (v: typeof version) => v.id === version.id
        )

        let s3Key
        if (index === 0) {
          s3Key = `${fileId}.${extension}`
        } else {
          s3Key = `${fileId}_${index}.${extension}`
        }

        const signedUrl = await getFileVersionSignedURLFromS3(
          s3Key,
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
