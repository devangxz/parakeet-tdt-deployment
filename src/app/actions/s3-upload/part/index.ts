'use server'

import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import logger from '@/lib/logger'
import { s3Client } from '@/lib/s3Client'

export async function getUploadPartSignedUrl(
  sendBackData: { key: string; uploadId: string },
  partNumber: number,
  contentLength: number
) {
  try {
    const command = new UploadPartCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: sendBackData.key,
      UploadId: sendBackData.uploadId,
      PartNumber: partNumber,
      ContentLength: contentLength,
    })
    const url = await getSignedUrl(s3Client, command, { expiresIn: 48 * 3600 })
    return { success: true, url }
  } catch (error) {
    logger.error(`Failed to get upload part signed URL: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
