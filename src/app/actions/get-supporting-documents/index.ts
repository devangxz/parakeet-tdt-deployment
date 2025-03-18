'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getSignedURLFromS3 } from '@/utils/backend-helper'

export interface SupportingDocument {
  id: number
  filename: string
  fileExtension: string
  url: string
}

export async function getSupportingDocumentsAction(fileId: string): Promise<{
  success: boolean
  message?: string
  documents?: SupportingDocument[]
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

    const documents = await prisma.miscJobsAttachments.findMany({
      where: {
        filename: fileId,
      },
    })

    const supportingDocuments: SupportingDocument[] = []

    if (documents.length > 0) {
      for (const doc of documents) {
        const signedUrl = await getSignedURLFromS3(
          `${doc.fileId}.${doc.fileExtension}`,
          5 * 60 * 60
        )

        let filename = `file.${doc.fileExtension}`
        if (typeof doc.originalFilename === 'string') {
          filename = doc.originalFilename
        }

        supportingDocuments.push({
          id: doc.id,
          filename,
          fileExtension: doc.fileExtension ?? '',
          url: signedUrl,
        })
      }
    }

    return {
      success: true,
      documents: supportingDocuments,
    }
  } catch (error) {
    logger.error(`Error fetching supporting documents: ${error}`)
    return {
      success: false,
      message: `Error fetching supporting documents: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}
