'use server'

import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3 } from '@/utils/backend-helper'

export async function getTestDiffFilesAction(fileId: string) {
  try {
    // Check if this is a test order
    const order = await prisma.order.findFirst({
      where: {
        fileId,
        isTestOrder: true
      }
    })

    if (!order) {
      return {
        success: false,
        message: 'Not a test order'
      }
    }

    // Get TEST_MASTER version
    const masterVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.TEST_MASTER
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Get TEST_MODIFIED version
    const modifiedVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.TEST_MODIFIED
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Get TEST_SUBMITTED version
    const submittedVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId,
        tag: FileTag.TEST_SUBMITTED
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Fetch the content for each version if available, with error handling and size limits
    let masterContent = null;
    let modifiedContent = null;
    let submittedContent = null;

    try {
      if (masterVersion?.s3VersionId) {
        const content = await getFileVersionFromS3(`${fileId}.txt`, masterVersion.s3VersionId);
        masterContent = content.toString();
      }
    } catch (error) {
      logger.error(`Failed to load TEST_MASTER for ${fileId}`, error);
    }

    try {
      if (modifiedVersion?.s3VersionId) {
        const content = await getFileVersionFromS3(`${fileId}.txt`, modifiedVersion.s3VersionId);
        modifiedContent = content.toString();
        
      }
    } catch (error) {
      logger.error(`Failed to load TEST_MODIFIED for ${fileId}`, error);
    }

    try {
      if (submittedVersion?.s3VersionId) {
        const content = await getFileVersionFromS3(`${fileId}.txt`, submittedVersion.s3VersionId);
        submittedContent = content.toString();
      }
    } catch (error) {
      logger.error(`Failed to load TEST_SUBMITTED for ${fileId}`, error);
    }

    return {
      success: true,
      isTestOrder: true,
      masterContent,
      modifiedContent,
      submittedContent
    }
  } catch (error) {
    logger.error(`Failed to get test versions for file ${fileId}`, error)
    return {
      success: false,
      message: 'An error occurred while fetching test files'
    }
  }
} 