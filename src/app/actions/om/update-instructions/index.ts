'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateInstructions(formData: {
  fileId: string
  instructions: string
}) {
  try {
    const { fileId, instructions } = formData

    if (!fileId) {
      return {
        success: false,
        message: 'File Id parameter is required.',
      }
    }

    const fileInformation = await prisma.file.findUnique({
      where: { fileId: fileId },
    })

    if (!fileInformation) {
      logger.error(`File not found for ${fileId}`)
      return {
        success: false,
        message: 'File not found',
      }
    }

    await prisma.order.update({
      where: { fileId: fileId },
      data: { instructions },
    })

    logger.info(`updated instructions, for ${fileId}`)
    return {
      success: true,
      message: 'Instructions updated successfully',
    }
  } catch (error) {
    logger.error(`Failed to update instructions`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
