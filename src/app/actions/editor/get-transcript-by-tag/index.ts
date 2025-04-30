'use server'

import { FileTag, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'

export async function getTranscriptByTagAction(
  fileId: string,
  tag: FileTag = FileTag.AUTO,
  userId?: number
): Promise<string | null> {
  try {
    logger.info(
      `--> getTranscriptByTagAction for fileId: ${fileId}, tag: ${tag}`
    )

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    if (!fileId || !tag) {
      throw new Error('File ID and tag are required')
    }

    const whereCondition: Prisma.FileVersionWhereInput = {
      fileId,
      tag,
    }
    if (userId) {
      whereCondition.userId = userId
    }

    let fileVersion = await prisma.fileVersion.findFirst({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        s3VersionId: true,
      },
    })

    if (!fileVersion?.s3VersionId && tag === FileTag.ASSEMBLY_AI) {
      logger.info(
        `Assembly AI version not found for fileId: ${fileId}, trying AUTO version`
      )
      fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId,
          tag: FileTag.AUTO,
          ...(userId && { userId }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          s3VersionId: true,
        },
      })
    }

    if (!fileVersion?.s3VersionId) {
      logger.info(
        `No transcript version found for fileId: ${fileId} with tag: ${tag}`
      )
      return null
    }

    const transcript = (
      await getFileVersionFromS3(`${fileId}.txt`, fileVersion.s3VersionId)
    ).toString()

    logger.info(
      `Successfully retrieved transcript for fileId: ${fileId} with tag: ${tag}`
    )
    return transcript
  } catch (error) {
    logger.error(
      `Error in getTranscriptByTagAction for fileId: ${fileId} with tag: ${tag}: ${error}`
    )
    return null
  }
}
