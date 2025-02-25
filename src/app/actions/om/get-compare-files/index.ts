'use server'

import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'

export async function getCompareFiles(
  reviewDiff: string,
  verificationDiff: string,
  fileId: string
) {
  try {
    const fileVersionMap = {
      asr: FileTag.AUTO,
      gemini: FileTag.GEMINI,
      qc: FileTag.QC_DELIVERED,
      'customer-delivered': FileTag.CUSTOMER_DELIVERED,
      'customer-edit': FileTag.CUSTOMER_EDIT,
    }

    if (!reviewDiff || !verificationDiff || !fileId) {
      logger.error('Missing reviewDiff, verificationDiff or fileId')
      return {
        success: false,
        message: 'Missing reviewDiff, verificationDiff or fileId',
      }
    }

    const reviewFileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: fileVersionMap[reviewDiff as keyof typeof fileVersionMap],
      },
      select: {
        s3VersionId: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!reviewFileVersion || !reviewFileVersion.s3VersionId) {
      logger.error(`Review file version not found for ${fileId}`)
      return {
        success: false,
        message: 'Review file version not found',
      }
    }

    const verificationFileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: fileVersionMap[verificationDiff as keyof typeof fileVersionMap],
      },
      select: {
        s3VersionId: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!verificationFileVersion || !verificationFileVersion.s3VersionId) {
      logger.error(`Verification file version not found for ${fileId}`)
      return {
        success: false,
        message: 'Verification file version not found',
      }
    }

    const reviewFile = (
      await getFileVersionFromS3(
        `${fileId}.txt`,
        reviewFileVersion?.s3VersionId
      )
    ).toString()
    const verificationFile = (
      await getFileVersionFromS3(
        `${fileId}.txt`,
        verificationFileVersion?.s3VersionId
      )
    ).toString()

    return {
      success: true,
      reviewFile,
      verificationFile,
    }
  } catch (err) {
    logger.error(
      `An error occurred while fetching review and verification files: ${
        (err as Error).message
      }`
    )
    return {
      success: false,
      message: 'Failed to fetch review and verification files.',
    }
  }
}
