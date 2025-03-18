'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { deleteFileFromS3, fileExistsInS3 } from '@/utils/backend-helper'

export async function deleteSupportingDocumentAction(
  documentId: number
): Promise<{
  success: boolean
  message?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const document = await prisma.miscJobsAttachments.findUnique({
      where: {
        id: documentId,
      },
    })

    if (!document) {
      return {
        success: false,
        message: 'Document not found',
      }
    }

    const s3Key = `${document.fileId}.${document.fileExtension}`

    const exists = await fileExistsInS3(s3Key)
    if (exists) {
      await deleteFileFromS3(s3Key)
      logger.info(`Deleted file from S3: ${s3Key}`)
    } else {
      logger.warn(`File not found in S3: ${s3Key}`)
    }

    await prisma.miscJobsAttachments.delete({
      where: {
        id: documentId,
      },
    })

    logger.info(
      `Successfully deleted supporting document with ID: ${documentId}`
    )

    return {
      success: true,
      message: 'Document deleted successfully',
    }
  } catch (error) {
    logger.error(`Error deleting supporting document: ${error}`)
    return {
      success: false,
      message: `Error deleting document: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}
