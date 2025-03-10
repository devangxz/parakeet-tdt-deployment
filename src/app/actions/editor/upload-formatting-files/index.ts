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
  isUpdate: boolean
  versionId?: number
  oldS3VersionId?: string
}

type S3UploadResult = {
  VersionId?: string
  [key: string]: unknown
}

type FileVersionToUpdate = {
  id: number
  oldS3VersionId?: string
  newS3VersionId: string
  s3Key: string
}

type FileVersionToCreate = {
  userId: number
  fileId: string
  tag: FileTag
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

    const filesByExtension = new Map<string, FileInfo[]>()

    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file-${i}`) as File | null
      if (!file) continue

      const extension = formData.get(`extension-${i}`) as string

      if (!filesByExtension.has(extension)) {
        filesByExtension.set(extension, [])
      }

      filesByExtension.get(extension)?.push({
        file,
        index: i,
        extension,
      })
    }

    const extensionsToProcess = Array.from(filesByExtension.keys())

    const fileVersionsToCreate: FileVersionToCreate[] = []
    const fileVersionsToUpdate: FileVersionToUpdate[] = []
    const s3UploadPromises: (UploadDetails & {
      promise: Promise<S3UploadResult>
    })[] = []

    for (const extension of extensionsToProcess) {
      const files = filesByExtension.get(extension) || []

      const existingVersions = await prisma.fileVersion.findMany({
        where: {
          userId: transcriberId,
          fileId,
          tag,
          extension,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      for (let i = 0; i < files.length; i++) {
        const fileInfo = files[i]
        const buffer = await fileInfo.file.arrayBuffer()

        let mimeType = 'application/octet-stream'
        const mimeTypes: Record<string, string> = {
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          pdf: 'application/pdf',
          txt: 'text/plain',
        }
        if (extension && extension in mimeTypes) {
          mimeType = mimeTypes[extension]
        }

        const existingVersion =
          i < existingVersions.length ? existingVersions[i] : null

        let s3Key
        if (i === 0) {
          s3Key = `${fileId}.${extension}`
        } else {
          s3Key = `${fileId}_${i}.${extension}`
        }

        const uploadDetails: UploadDetails = {
          s3Key,
          extension,
          index: i,
          isUpdate: !!existingVersion,
          versionId: existingVersion?.id,
          oldS3VersionId: existingVersion?.s3VersionId || undefined,
        }

        s3UploadPromises.push({
          promise: uploadToS3(s3Key, Buffer.from(buffer), mimeType),
          ...uploadDetails,
        })
      }
    }

    const s3Results = await Promise.all(
      s3UploadPromises.map((item) =>
        item.promise.then((result) => ({
          ...item,
          s3VersionId: result.VersionId || '',
        }))
      )
    )

    for (const result of s3Results) {
      if (result.isUpdate && result.versionId) {
        fileVersionsToUpdate.push({
          id: result.versionId,
          oldS3VersionId: result.oldS3VersionId,
          newS3VersionId: result.s3VersionId,
          s3Key: result.s3Key,
        })
      } else {
        fileVersionsToCreate.push({
          userId: transcriberId,
          fileId,
          tag,
          s3VersionId: result.s3VersionId,
          extension: result.extension,
        })
      }
    }

    await prisma.$transaction(async (tx) => {
      if (fileVersionsToCreate.length > 0) {
        await tx.fileVersion.createMany({
          data: fileVersionsToCreate,
        })
      }

      for (const version of fileVersionsToUpdate) {
        await tx.fileVersion.update({
          where: { id: version.id },
          data: { s3VersionId: version.newS3VersionId },
        })

        if (version.oldS3VersionId) {
          try {
            await deleteFileVersionFromS3(version.s3Key, version.oldS3VersionId)
          } catch (error) {
            logger.error(
              `Error deleting old version ${version.oldS3VersionId}: ${error}`
            )
          }
        }
      }
    })

    logger.info(
      `${s3Results.length} files uploaded successfully for formatting order ${fileId}`
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
