'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getCFDData(fileId: string) {
  if (!fileId) {
    return {
      success: false,
      message: 'Missing required fileId parameter',
    }
  }

  try {
    logger.info(`Fetching CFD data for fileId: ${fileId}`)

    const file = await prisma.file.findUnique({
      where: { fileId },
      select: { customFormattingDetails: true },
    })

    if (!file) {
      logger.warn(`File not found for fileId: ${fileId}`)
      return {
        success: false,
        message: 'File not found',
      }
    }

    logger.info(`Successfully retrieved CFD data for fileId: ${fileId}`)
    return {
      success: true,
      cfdData: file.customFormattingDetails,
    }
  } catch (error) {
    logger.error(`Error fetching CFD data for fileId ${fileId}:`, error)
    return {
      success: false,
      message: 'Failed to retrieve CFD data',
    }
  }
}
