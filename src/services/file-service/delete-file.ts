import { DeleteObjectCommand } from '@aws-sdk/client-s3'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import s3Client from '@/lib/s3-client'

interface DeleteFileParams {
  userId: number
  fileId: string
}

export const getListOfGeneratedFiles = (fileId: string) => [
  `${fileId}_ris.docx`,
  `${fileId}_asr.txt`,
  `${fileId}.mp4`,
  `${fileId}.mp3`,
  `${fileId}_assembly_ai_ctms.json`,
  `${fileId}_assembly_ai_gpt_4o_ctms.json`,
  `${fileId}_qc.txt`,
  `${fileId}_cf_rev.docx`,
  `${fileId}_transcript.docx`,
  `${fileId}.txt`,
]

export async function deleteFile({ userId, fileId }: DeleteFileParams) {
  try {
    const fileExists = await prisma.file.findUnique({
      where: { fileId: fileId, userId: userId },
    })

    if (!fileExists) {
      logger.error(`File with ID ${fileId} not found for user ${userId}`)
      return { fileId, status: 'not found' }
    }

    await prisma.file.update({
      where: { fileId },
      data: { deletedAt: new Date() },
    })

    const keys = getListOfGeneratedFiles(fileId)
    await Promise.all(
      keys.map(async (key: string) => {
        const command = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
        })
        await s3Client.send(command)
      })
    )

    logger.info(`File with ID ${fileId} deleted successfully by user ${userId}`)
    return { fileId, status: 'deleted' }
  } catch (error) {
    logger.error(
      `Failed to delete file with ID ${fileId} for user ${userId}`,
      error
    )
    throw new Error('Failed to delete file')
  }
}
