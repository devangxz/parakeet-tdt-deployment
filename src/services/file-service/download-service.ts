import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import s3Client from '@/lib/s3-client'

interface GetDownloadUrlParams {
  fileId: string
}

export async function getDownloadUrl({ fileId }: GetDownloadUrlParams) {
  try {
    if (!fileId) {
      logger.error('File id is required')
      return { success: false, s: 'File Id is required' }
    }

    const file = await prisma.file.findUnique({
      where: { fileId },
    })

    if (!file) {
      logger.error(`File with ID ${fileId} not found`)
      return { success: false, s: 'File not found' }
    }

    const encodedFilename = encodeURIComponent(file.filename ?? '')
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${fileId}.mp3`,
      ResponseContentDisposition: `attachment; filename=${encodedFilename}.mp3`,
    })

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 900,
    })

    logger.info(`Generated download URL for file ${fileId}`)
    return { success: true, url: signedUrl }
  } catch (error) {
    logger.error(`Error generating download URL for file ${fileId}:`, error)
    return { success: false, s: 'Failed to generate download URL' }
  }
}
