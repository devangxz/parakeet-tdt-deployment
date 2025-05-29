import { CopyObjectCommand } from '@aws-sdk/client-s3'
import { FileStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import s3Client from '@/lib/s3-client'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req)
  const bucketName = process.env.AWS_S3_BUCKET_NAME
  const newFileId = generateUniqueId()

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { fileId } = await req.json()

  if (!fileId) {
    return NextResponse.json(
      { message: 'File IDs is required' },
      { status: 400 }
    )
  }

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
      return NextResponse.json({
        success: false,
        message: 'File not found',
      })
    }

    const newFileName = `Copy of ${existingFile.filename}`

    await s3Client.send(new CopyObjectCommand(audioFileParams))

    await prisma.file.create({
      data: {
        userId: existingFile.userId,
        fileId: newFileId,
        filename: newFileName,
        fileKey: existingFile.fileKey,
        filesize: existingFile.filesize,
        duration: existingFile.duration,
        bitRate: existingFile.bitRate,
        sampleRate: existingFile.sampleRate,
        uploadedBy: user?.userId as number,
        fileStatus: FileStatus.NONE,
        converted: true,
        reportOption: existingFile.reportOption,
        reportComment: existingFile.reportComment,
      },
    })

    logger.info(
      `Successfully copied audio file: ${fileId}.mp3 to ${newFileId}.mp3`
    )

    return NextResponse.json({
      success: true,
      newFileId,
    })
  } catch (error) {
    logger.error(`Failed to delete file: ${error}`)
    return NextResponse.json(
      { message: 'Error deleting file' },
      { status: 500 }
    )
  }
}
