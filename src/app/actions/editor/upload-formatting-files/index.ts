'use server'

import { FileTag, OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { deleteFileVersionFromS3, uploadToS3 } from '@/utils/backend-helper'

type FileInfo = {
  file: File
  index: number
  extension: string
}

type UploadDetails = {
  s3Key: string
  extension: string
  index: number
}

type S3UploadResult = {
  VersionId?: string
  [key: string]: unknown
}

type FileVersionToCreate = {
  userId: number
  fileId: string
  tag: FileTag
  s3Key: string
  s3VersionId: string
  extension: string
}

export async function uploadFormattingFilesAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId as number

    const fileId = formData.get('fileId') as string
    const fileCount = parseInt(formData.get('fileCount') as string, 10)

    if (!fileId) {
      return {
        success: false,
        message: 'File ID is required',
      }
    }

    if (isNaN(fileCount) || fileCount <= 0) {
      return {
        success: false,
        message: 'Invalid file count',
      }
    }

    const order = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
    })

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      }
    }

    if (order.orderType !== 'FORMATTING') {
      return {
        success: false,
        message: 'This action is only for FORMATTING order types',
      }
    }

    let tag: FileTag = FileTag.CF_REV_SUBMITTED

    if (order.status === OrderStatus.FINALIZER_ASSIGNED) {
      tag = FileTag.CF_FINALIZER_SUBMITTED
    }

    if (order.status === OrderStatus.PRE_DELIVERED) {
      tag = FileTag.CF_OM_DELIVERED
    }

    const existingVersions = await prisma.fileVersion.findMany({
      where: {
        userId: transcriberId,
        fileId,
        tag,
      },
    })

    const files: FileInfo[] = []
    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file-${i}`) as File | null
      if (!file) continue

      const extension = formData.get(`extension-${i}`) as string
      files.push({
        file,
        index: i,
        extension,
      })
    }

    const s3UploadPromises: (UploadDetails & {
      promise: Promise<S3UploadResult>
    })[] = []

    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i]
      const buffer = await fileInfo.file.arrayBuffer()

      let mimeType = 'application/octet-stream'
      const mimeTypes: Record<string, string> = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf: 'application/pdf',
        txt: 'text/plain',
      }
      if (fileInfo.extension && fileInfo.extension in mimeTypes) {
        mimeType = mimeTypes[fileInfo.extension]
      }

      const s3Key = files.length === 1 
        ? `${fileId}.${fileInfo.extension}`
        : `${fileId}_${i + 1}.${fileInfo.extension}`

      s3UploadPromises.push({
        promise: uploadToS3(s3Key, Buffer.from(buffer), mimeType),
        s3Key,
        extension: fileInfo.extension,
        index: i,
      })
    }

    const s3Results = await Promise.all(
      s3UploadPromises.map((item) =>
        item.promise.then((result) => ({
          ...item,
          s3VersionId: result.VersionId || '',
        }))
      )
    )

    const fileVersionsToCreate: FileVersionToCreate[] = s3Results.map(
      (result) => ({
        userId: transcriberId,
        fileId,
        tag,
        s3Key: result.s3Key,
        s3VersionId: result.s3VersionId,
        extension: result.extension,
      })
    )

    await prisma.$transaction(async (tx) => {
      if (existingVersions.length > 0) {
        for (const version of existingVersions) {
          try {
            logger.info(
              `Attempting to delete S3 object with key: ${version.s3Key} and versionId: ${version.s3VersionId}`
            )

            if (version.s3Key && version.s3VersionId) {
              await deleteFileVersionFromS3(version.s3Key, version.s3VersionId)
              logger.info(`Successfully deleted S3 object: ${version.s3Key}`)
            }
          } catch (error) {
            logger.error(
              `Error deleting S3 version for ${version.id}: ${error}`
            )
          }
        }

        await tx.fileVersion.deleteMany({
          where: {
            userId: transcriberId,
            fileId,
            tag,
          },
        })
      }

      if (fileVersionsToCreate.length > 0) {
        await tx.fileVersion.createMany({
          data: fileVersionsToCreate,
        })
      }
    })

    logger.info(
      `${s3Results.length} files uploaded successfully for formatting order ${fileId} (replaced ${existingVersions.length} existing files)`
    )
    return {
      success: true,
      message: 'Files uploaded successfully',
    }
  } catch (error) {
    logger.error(`Error uploading formatting files: ${error}`)
    return {
      success: false,
      message: `Error uploading files: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}
