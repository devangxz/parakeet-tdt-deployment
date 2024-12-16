'use server'

import config from '../../../../../config.json'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateDifficulty(formData: {
  fileId: string
  difficulty: 'low' | 'medium' | 'high'
}) {
  try {
    const { fileId, difficulty } = formData

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
      return { success: false, message: 'File not found' }
    }

    let pwer = 0

    if (difficulty === 'low') {
      pwer = config.asr.difficulty.low
    } else if (difficulty === 'medium') {
      pwer = config.asr.difficulty.medium
    } else if (difficulty === 'high') {
      pwer = config.asr.difficulty.high
    }

    await prisma.order.update({
      where: { fileId: fileId },
      data: { pwer, updatedAt: new Date() },
    })

    logger.info(`difficulty level set to ${difficulty} for file ${fileId}`)
    return {
      success: true,
      message: 'Difficulty level updated successfully',
    }
  } catch (error) {
    logger.error(`Failed to update difficulty`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
