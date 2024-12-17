'use server'

import { ListPartsCommand } from '@aws-sdk/client-s3'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { s3Client } from '@/lib/s3Client'
import { requireCustomer } from '@/utils/checkRoles'

export async function checkUploadSession(
  fileName: string,
  fileSize: number,
  sourceType: string,
  sourceId: string | null
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    if (!requireCustomer(user)) {
      return {
        success: false,
        message: 'Action is not allowed',
      }
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const baseWhereClause: Prisma.UploadSessionWhereInput = {
      userId: user.userId,
      createdAt: {
        gte: sevenDaysAgo,
      },
      sourceInfo: {
        path: ['sourceType'],
        equals: sourceType,
      },
    }

    const andConditions: Prisma.UploadSessionWhereInput[] = [
      {
        sourceInfo: {
          path: ['fileName'],
          equals: fileName,
        },
      },
      {
        sourceInfo: {
          path: ['fileSize'],
          equals: fileSize,
        },
      },
    ]

    if (sourceType !== 'local') {
      if (!sourceId) {
        return {
          success: false,
          message: 'sourceId is required for non-local sources',
        }
      }

      andConditions.push({
        sourceInfo: {
          path: ['sourceId'],
          equals: sourceId,
        },
      })
    }

    const whereClause: Prisma.UploadSessionWhereInput = {
      ...baseWhereClause,
      AND: andConditions,
    }

    const existingSession = await prisma.uploadSession.findFirst({
      where: whereClause,
    })

    if (!existingSession) {
      return {
        success: true,
        exists: false,
      }
    }

    try {
      const command = new ListPartsCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: existingSession.key,
        UploadId: existingSession.uploadId,
      })
      const s3Response = await s3Client.send(command)

      return {
        success: true,
        exists: true,
        uploadId: existingSession.uploadId,
        key: existingSession.key,
        parts: (s3Response.Parts ?? []).map((part) => ({
          ETag: part.ETag,
          PartNumber: part.PartNumber,
        })),
      }
    } catch (error) {
      await prisma.uploadSession.delete({
        where: { id: existingSession.id },
      })
      return {
        success: true,
        exists: false,
      }
    }
  } catch (error) {
    logger.error(`Failed to check existing upload session: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
