'use server'

import { FileTag } from '@prisma/client'

import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'

export async function getDraftTranscriptAction(fileId: string) {
  try {
    const qcDeliveredVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.QC_DELIVERED,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        s3VersionId: true,
      },
    })

    if (qcDeliveredVersion?.s3VersionId) {
      const transcript = (
        await getFileVersionFromS3(
          `${fileId}.txt`,
          qcDeliveredVersion.s3VersionId
        )
      ).toString()
      return {
        success: true,
        transcript,
        source: 'QC_DELIVERED',
      }
    }

    const qcEditVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.QC_EDIT,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        s3VersionId: true,
      },
    })

    if (qcEditVersion?.s3VersionId) {
      const transcript = (
        await getFileVersionFromS3(`${fileId}.txt`, qcEditVersion.s3VersionId)
      ).toString()
      return {
        success: true,
        transcript,
        source: 'QC_EDIT',
      }
    }

    const gpt40Version = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.ASSEMBLY_AI_GPT_4O,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        s3VersionId: true,
      },
    })

    if (gpt40Version?.s3VersionId) {
      const transcript = (
        await getFileVersionFromS3(`${fileId}.txt`, gpt40Version.s3VersionId)
      ).toString()
      return {
        success: true,
        transcript,
        source: 'ASSEMBLY_AI_GPT_4O',
      }
    }

    const autoVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.AUTO,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        s3VersionId: true,
      },
    })

    if (autoVersion?.s3VersionId) {
      const transcript = (
        await getFileVersionFromS3(`${fileId}.txt`, autoVersion.s3VersionId)
      ).toString()
      return {
        success: true,
        transcript,
        source: 'AUTO',
      }
    }

    return {
      success: false,
      message: 'Under processing. Please try again after some time.',
    }
  } catch (error) {
    console.error('Error fetching draft transcript:', error)
    return {
      success: false,
      message: 'Failed to fetch transcript',
    }
  }
}
