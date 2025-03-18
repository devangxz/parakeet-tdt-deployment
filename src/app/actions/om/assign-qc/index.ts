'use server'

import { JobType, OrderStatus, InputFileType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToQC from '@/services/transcribe-service/assign-file-to-qc'

export async function assignQC(fileId: string, userEmail: string) {
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

    await assignFileToQC(
      orderInformation.id,
      OrderStatus.QC_ASSIGNED,
      user.id,
      JobType.QC,
      InputFileType.ASR_OUTPUT,
      fileId,
      'MANUAL'
    )

    logger.info(`Successfully assigned qc for file ${fileId}`)
    return {
      success: true,
      message: 'Successfully assigned qc file',
    }
  } catch (error) {
    logger.error(`Failed to assign qc`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
