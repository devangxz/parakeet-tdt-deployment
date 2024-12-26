'use server'

import path from 'path'

import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { s3Client } from '@/lib/s3Client'
import { requireCustomer } from '@/utils/checkRoles'

export async function createMultipartUpload(
  type: string,
  originalName: string,
  fileId: string,
  size: number,
  source: string,
  sourceId: string | null,
  apiUser?: {
    userId: number
    internalTeamUserId?: number
  }
) {
  try {
    let user

    if (apiUser) {
      user = apiUser
    } else {
      const session = await getServerSession(authOptions)
      user = session?.user

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
    }

    const fileName = path.parse(originalName).name
    const fileExtension = path.extname(originalName)
    const fileKey =
      fileExtension.toLowerCase() === '.docx'
        ? fileId + fileExtension
        : `${fileName}_${fileId}${fileExtension}`

    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: type,
      Metadata: {
        upload_environment: process.env.UPLOAD_ENVIRONMENT || 'STAGING',
        type:
          fileExtension.toLowerCase() === '.docx'
            ? 'DOCX_FILE'
            : 'ORIGINAL_FILE',
        user_id: user.userId?.toString(),
        team_user_id:
          user.internalTeamUserId?.toString() || user.userId?.toString(),
        file_id: fileId,
        file_name: path.parse(originalName).name,
      },
    })
    const data = await s3Client.send(command)

    if (!apiUser) {
      await prisma.uploadSession.create({
        data: {
          uploadId: data.UploadId!,
          key: data.Key!,
          userId: user.userId,
          sourceInfo: {
            sourceType: source,
            sourceId: sourceId || null,
            fileName: originalName,
            fileSize: size,
          },
        },
      })
    }

    return {
      success: true,
      uploadId: data.UploadId,
      key: data.Key,
    }
  } catch (error) {
    logger.error(`Failed to create multipart upload: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
