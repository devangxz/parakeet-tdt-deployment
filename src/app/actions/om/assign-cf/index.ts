'use server'

import { InputFileType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToReviewer from '@/services/transcribe-service/assign-file-to-review'

export async function assignCF(fileId: string, userEmail: string) {
  try {
    if (!fileId) {
      return {
        success: false,
        message: 'File Id parameter is required.',
      }
    }

    const orderInformation = await prisma.order.findUnique({
      where: { fileId: fileId },
    })

    if (!orderInformation) {
      logger.error(`File not found for ${fileId}`)
      return { success: false, message: 'File not found' }
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
    })

    if (!user) {
      logger.error(`User not found for ${userEmail}`)
      return { success: false, message: 'User not found' }
    }

    await assignFileToReviewer(
      orderInformation.id,
      orderInformation.fileId,
      user.id,
      InputFileType.LLM_OUTPUT,
      'MANUAL',
      true
    )

    logger.info(`Successfully assigned cf for file ${fileId}`)
    return {
      success: true,
      message: 'Successfully assigned cf file',
    }
  } catch (error) {
    logger.error(`Failed to assign cf`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
