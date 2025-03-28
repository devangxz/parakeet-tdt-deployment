'use server'

import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionSignedURLFromS3 } from '@/utils/backend-helper'

export async function getFileTxtSignedUrl(fileId: string) {
  try {
    const file = await prisma.file.findFirst({
      where: {
        fileId: fileId,
      },
    })

    if (!file) {
      return {
        success: false,
        message: 'File not found',
      }
    }

    let fileVersion = ''

    const customerEditFileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId: fileId,
        tag: FileTag.CUSTOMER_EDIT,
      },
      orderBy: {
        createdAt: 'desc',
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
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          s3VersionId: true,
        },
      })

      if (
        !customerDeliveredFileVersion ||
        !customerDeliveredFileVersion.s3VersionId
      ) {
        return {
          success: false,
          message: 'Transcript not found',
        }
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

    return {
      success: true,
      message: 'Downloaded Successfully',
      signedUrl,
    }
  } catch (error) {
    logger.error(`Failed to send txt file ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
