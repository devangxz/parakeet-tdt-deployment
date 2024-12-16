/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateCfdData(fileId: string, cfd: any) {
  try {
    if (!fileId || !cfd) {
      return {
        success: false,
        message: 'Missing required parameters',
      }
    }

    logger.info(`Updating CFD data for fileId: ${fileId}`)

    const updatedFile = await prisma.file.update({
      where: { fileId },
      data: { customFormattingDetails: cfd },
      select: { customFormattingDetails: true },
    })

    if (!updatedFile) {
      logger.warn(`File not found for fileId: ${fileId}`)
      return {
        success: false,
        message: 'File not found',
      }
    }

    logger.info(`Successfully updated CFD data for fileId: ${fileId}`)
    return {
      success: true,
      updatedCfdData: updatedFile.customFormattingDetails,
    }
  } catch (error) {
    logger.error('Error updating CFD data:', error)
    return {
      success: false,
      message: 'Failed to update CFD data',
    }
  }
}
