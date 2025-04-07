"use server"
import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { 
  uploadToS3, 
  getFileVersionFromS3, 
} from '@/utils/backend-helper'

/**
 * Gets the transcript version ID for a file identified by TEST_MASTER tag
 * using the order ID
 * 
 * @param orderId - The ID of the order to find the transcript for
 * @returns The version ID and fileId if found, or null values if not found
 */
export async function getTranscriptVersion(orderId: number, fileId: string, userId: number): Promise<{ 
  transcript: string | null,
  modified: boolean,
  modifiedTranscript?: string
}> {
  try {
    logger.info(`--> getTranscriptVersion for orderId: ${orderId}`)

    const testAttempt = await prisma.testAttempt.findFirst({
      where: {
        fileId,
        userId
      },
      orderBy: {
        completedAt: 'desc'
      }
    })

    if (testAttempt) {
      let fileTag = null;

      if (testAttempt.status === 'ACCEPTED') {
        fileTag = FileTag.TEST_MODIFIED;
      } else if (testAttempt.status === 'SUBMITTED_FOR_APPROVAL') {
        fileTag = FileTag.TEST_SUBMITTED;
      }

      if (fileTag) {
        const fileVersion = await prisma.fileVersion.findFirst({
          where: {
            fileId,
            tag: fileTag,
            userId: userId
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            s3VersionId: true,
            s3Key: true
          }
        })

        if (fileVersion?.s3VersionId) {
          const transcript = (await getFileVersionFromS3(`${fileId}.txt`, fileVersion.s3VersionId as string)).toString()
          logger.info(`Found ${fileTag} transcript version for orderId: ${orderId}, fileId: ${fileId}`)
          return { transcript, modified: fileTag === FileTag.TEST_MODIFIED, modifiedTranscript: transcript }
        }
      }
    }

    // Fallback to master version if no modified or submitted version is found
    const masterFileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.TEST_MASTER
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        s3VersionId: true,
        s3Key: true
      }
    })

    if (!masterFileVersion || !masterFileVersion.s3VersionId) {
      logger.warn(`No transcript version found for fileId: ${fileId}`)
      return { transcript: null, modified: false }
    }

    logger.info(`Found master transcript version for orderId: ${orderId}, fileId: ${fileId}`)
    const transcript = (await getFileVersionFromS3(`${fileId}.txt`, masterFileVersion.s3VersionId as string)).toString()

    return { transcript, modified: false }
  } catch (error) {
    logger.error(`Error in getTranscriptVersion: ${error}`)
    return { transcript: null, modified: false }
  }
}

/**
 * Sets a modified transcript version by uploading to S3 with fileId.txt name
 * and creating a file version with TEST_MODIFIED tag
 * 
 * @param fileId - The ID of the file to set the transcript for
 * @param transcriptContent - The modified transcript content
 * @param userId - The ID of the user making the change
 * @returns Success status and message
 */
export async function setTranscriptVersion(
  fileId: string,
  transcriptContent: string,
  userId: number
): Promise<{ success: boolean; message: string; versionId?: string }> {
  try {
    logger.info(`--> setTranscriptVersion for fileId: ${fileId}`)
    
    // Check if the file exists
    const file = await prisma.file.findUnique({
      where: {
        fileId
      }
    })

    if (!file) {
      logger.error(`File not found for fileId: ${fileId}`)
      return { success: false, message: 'File not found' }
    }

    // Upload modified transcript to S3
    const modifiedFileKey = `${fileId}.txt`
    const { VersionId } = await uploadToS3(
      modifiedFileKey,
      transcriptContent
    )

    if (!VersionId) {
      logger.error(`Failed to upload modified transcript for fileId: ${fileId}`)
      return { success: false, message: 'Failed to upload modified transcript' }
    }

    // Always create a new file version with TEST_MODIFIED tag
    await prisma.fileVersion.create({
      data: {
        fileId,
        tag: FileTag.TEST_MODIFIED,
        s3VersionId: VersionId,
        s3Key: modifiedFileKey,
        userId,
        extension: 'txt'
      }
    })

    logger.info(`Successfully set transcript version for fileId: ${fileId}`)
    return { success: true, message: 'Transcript version set successfully', versionId: VersionId }
  } catch (error) {
    logger.error(`Error in setTranscriptVersion: ${error}`)
    return { success: false, message: `Error setting transcript version: ${error}` }
  }
}

export async function getModifiedTranscript(fileId: string, userId: number) {
  try {
    const fileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        userId,
        tag: FileTag.TEST_MODIFIED,
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        s3VersionId: true,
        s3Key: true
      }
    })

    if (!fileVersion) {
      return null
    }
    
    const transcript = (await getFileVersionFromS3(`${fileId}.txt`, fileVersion.s3VersionId as string)).toString()
    return transcript
  } catch (error) {
    logger.error(`Error in getModifiedTranscript: ${error}`)
    return null
  }
}
