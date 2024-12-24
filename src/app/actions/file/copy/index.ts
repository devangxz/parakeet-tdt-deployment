'use server'

import { CopyObjectCommand } from '@aws-sdk/client-s3'
import { FileStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import s3Client from '@/lib/s3-client'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function copyFile(fileId: string) {
  const bucketName = process.env.AWS_S3_BUCKET
  const newFileId = generateUniqueId()
  const session = await getServerSession(authOptions)
  const user = session?.user

  const audioFileParams = {
    Bucket: bucketName,
    CopySource: `/${bucketName}/${fileId}.mp3`,
    Key: `${newFileId}.mp3`,
  }

  try {
    const existingFile = await prisma.file.findUnique({
      where: {
        fileId,
      },
    })

    if (!existingFile) {
      logger.error(`File not found: ${fileId}`)
      return {
        success: false,
        message: 'File not found',
      }
    }

    const newFileName = `Copy of ${existingFile.filename}`

    await s3Client.send(new CopyObjectCommand(audioFileParams))

    await prisma.file.create({
      data: {
        userId: existingFile.userId,
        fileId: newFileId,
        filename: newFileName,
        fileKey: `${newFileName}_${newFileId}.mp3`,
        filesize: existingFile.filesize,
        duration: existingFile.duration,
        bitRate: existingFile.bitRate,
        sampleRate: existingFile.sampleRate,
        uploadedBy: user?.userId as number,
        fileStatus: FileStatus.NONE,
        converted: true,
      },
    })

    logger.info(
      `Successfully copied audio file: ${fileId}.mp3 to ${newFileId}.mp3`
    )

    return {
      success: true,
      newFileId,
    }
  } catch (error) {
    logger.error(
      `Failed to copy audio file: ${fileId}.mp3 to ${newFileId}.mp3`,
      error
    )
    return {
      success: false,
      message: 'Failed to copy file',
    }
  }
}
