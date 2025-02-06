import { FileStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface Metadata {
  duration: number
  bitRate?: number
  sampleRate?: number
  codecName?: string
  fileSize?: number
  converted?: boolean
  fileName?: string
  fileId?: string
  fileKey?: string
  parentId?: string
  fullPath?: string
  risData?: string
  userId: string
  teamUserId: string
}

const saveFileMetadata = async (metadata: Metadata): Promise<void> => {
  try {
    const fileSize = Math.floor(metadata?.fileSize ?? 0).toString()
    const duration = Math.floor(Number(metadata?.duration?.toFixed(2) ?? 0))
    const userId = Number(metadata?.userId)
    const teamUserId = Number(metadata?.teamUserId)

    let isDuplicate = false

    const existingFile = await prisma.file.findFirst({
      where: {
        filename: metadata?.fileName,
        userId: teamUserId,
        NOT: {
          fileId: metadata?.fileId,
        },
      },
    })
    isDuplicate = existingFile !== null

    const fileWithSameFileId = await prisma.file.findUnique({
      where: {
        fileId: metadata?.fileId ?? '',
      },
    })

    if (fileWithSameFileId) {
      logger.info(`Updating file metadata for ${metadata?.fileId}`)
      await prisma.file.update({
        where: {
          fileId: metadata?.fileId ?? '',
        },
        data: {
          bitRate: metadata?.bitRate ? Number(metadata.bitRate) : null,
          sampleRate: metadata?.sampleRate ? Number(metadata.sampleRate) : null,
          filesize: fileSize,
          fileKey: metadata?.fileKey,
          fileStatus: isDuplicate ? FileStatus.DUPLICATE : FileStatus.NONE,
          converted: null,
        },
      })
    } else {
      logger.info(`Saving file metadata for ${metadata?.fileId}`)
      const fileData = {
        userId: teamUserId,
        filename: metadata?.fileName ?? '',
        fileId: metadata?.fileId ?? '',
        fileKey: metadata?.fileKey,
        duration: duration,
        bitRate: metadata?.bitRate ? Number(metadata.bitRate) : null,
        sampleRate: metadata?.sampleRate ? Number(metadata.sampleRate) : null,
        filesize: fileSize,
        uploadedBy: userId,
        fileStatus: isDuplicate ? FileStatus.DUPLICATE : FileStatus.NONE,
        converted: null,
        parentId: Number(metadata.parentId) ?? null,
        fullPath: metadata?.fullPath || '',
      }

      await prisma.file.create({
        data: fileData,
      })
    }
  } catch (err) {
    logger.error(`Errro saving file: ${err}`)
    throw new Error('Error saving file')
  }
}

export default saveFileMetadata
