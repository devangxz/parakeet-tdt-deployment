'use server'

import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { s3Client } from '@/lib/s3Client'

export async function completeMultipartUpload(
  sendBackData: { key: string; uploadId: string },
  parts: { ETag?: string; PartNumber: number }[]
) {
  try {
    const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber)

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: sendBackData.key,
      UploadId: sendBackData.uploadId,
      MultipartUpload: { Parts: sortedParts },
    })
    await s3Client.send(command)

    logger.info(`File uploaded successfully. File: ${sendBackData.key}`)

    await prisma.uploadSession.deleteMany({
      where: {
        uploadId: sendBackData.uploadId,
      },
    })

    return { success: true }
  } catch (error) {
    logger.error(`Failed to complete multipart upload: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
