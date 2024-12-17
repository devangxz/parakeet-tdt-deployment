'use server'

import { InputFileType, OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToFinalizer from '@/services/transcribe-service/assign-file-to-finalizer'

export async function assignFinalizer(fileId: string, userEmail: string) {
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

    if (orderInformation.status !== OrderStatus.REVIEW_COMPLETED) {
      logger.error(
        `Finalizer can be assigned to ${orderInformation.status} file ${fileId}`
      )
      return {
        success: false,
        message: 'Finalizer can only be assigned to review completed files.',
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
    })

    if (!user) {
      logger.error(`User not found for ${userEmail}`)
      return { success: false, message: 'User not found' }
    }

    await assignFileToFinalizer(
      orderInformation.id,
      fileId,
      user.id,
      InputFileType.LLM_OUTPUT
    )

    logger.info(`Successfully assigned finalizer for file ${fileId}`)
    return {
      success: true,
      message: 'Successfully assigned finalizer file',
    }
  } catch (error) {
    logger.error(`Failed to assign finalizer`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
