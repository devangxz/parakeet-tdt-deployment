'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  deleteFileVersionFromS3,
  fileExistsInS3,
  uploadToS3,
} from '@/utils/backend-helper'
import { generateUniqueId } from '@/utils/generateUniqueId'

const MAX_FILE_SIZE = 1024 * 1024 * 1024
const MAX_FILES = 5
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt']

export async function uploadSupportingDocumentsAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const orderFileId = formData.get('fileId') as string
    const fileCount = parseInt(formData.get('fileCount') as string, 10)

    if (isNaN(fileCount) || fileCount <= 0) {
      return {
        success: false,
        message: 'Invalid file count',
      }
    }

    if (fileCount > MAX_FILES) {
      return {
        success: false,
        message: `Maximum ${MAX_FILES} files allowed. Please contact support for more.`,
      }
    }

    // Check for existing attachments and delete them
    const existingAttachments = await prisma.miscJobsAttachments.findMany({
      where: {
        filename: orderFileId,
      },
    })

    // Delete existing attachments from S3 and database
    if (existingAttachments.length > 0) {
      logger.info(
        `Deleting ${existingAttachments.length} existing attachments for file ${orderFileId}`
      )

      for (const attachment of existingAttachments) {
        const s3Key = `${attachment.fileId}.${attachment.fileExtension}`

        // Check if file exists in S3 before attempting to delete
        const exists = await fileExistsInS3(s3Key)
        if (exists) {
          try {
            // We don't have the version ID stored, but we can delete the latest version
            await deleteFileVersionFromS3(s3Key, 'null')
            logger.info(`Deleted file from S3: ${s3Key}`)
          } catch (error) {
            logger.error(`Failed to delete file from S3: ${s3Key}, ${error}`)
          }
        }
      }

      // Delete all attachments from database
      await prisma.miscJobsAttachments.deleteMany({
        where: {
          filename: orderFileId,
        },
      })

      logger.info(
        `Deleted existing attachments from database for file ${orderFileId}`
      )
    }

    const uploadResults = []

    for (let i = 0; i < fileCount; i++) {
      const file = formData.get(`file-${i}`) as File | null
      if (!file) continue

      // Validate file extension
      const fileParts = file.name.split('.')
      const fileExtension =
        fileParts.length > 1
          ? fileParts[fileParts.length - 1].toLowerCase()
          : ''

      if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        return {
          success: false,
          message: `File type not allowed: ${fileExtension}. Allowed types: ${ALLOWED_EXTENSIONS.join(
            ', '
          )}`,
        }
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return {
          success: false,
          message: `File size exceeds the maximum allowed size of 1GB: ${file.name}`,
        }
      }

      // Determine content type
      let contentType = 'application/octet-stream'
      const mimeTypes: Record<string, string> = {
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf: 'application/pdf',
        txt: 'text/plain',
      }

      if (fileExtension in mimeTypes) {
        contentType = mimeTypes[fileExtension]
      }

      // Generate S3 key
      const fileId = generateUniqueId()
      const s3Key = `${fileId}.${fileExtension}`

      // Upload to S3
      const buffer = await file.arrayBuffer()
      const { VersionId } = await uploadToS3(
        s3Key,
        Buffer.from(buffer),
        contentType
      )

      // Save to database
      const attachment = await prisma.miscJobsAttachments.create({
        data: {
          fileId,
          filename: orderFileId,
          originalFilename: file.name,
          fileExtension,
          s3Bucket: process.env.AWS_S3_BUCKET_NAME || 'cgws',
        },
      })

      uploadResults.push({
        id: attachment.id,
        filename: file.name,
        s3Key,
        versionId: VersionId,
      })
    }

    logger.info(
      `Successfully uploaded ${uploadResults.length} supporting documents for file ${orderFileId}`
    )

    return {
      success: true,
      message: 'Files uploaded successfully',
      files: uploadResults,
    }
  } catch (error) {
    logger.error(`Error uploading supporting documents: ${error}`)
    return {
      success: false,
      message: `Error uploading files: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}
