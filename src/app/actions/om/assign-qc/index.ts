'use server'

import { JobType, OrderStatus, InputFileType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToQC from '@/services/transcribe-service/assign-file-to-qc'
import { fileExistsInS3 } from '@/utils/backend-helper'

export async function assignQC(
  fileId: string,
  userEmail: string,
  resetTimer = false
) {
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

    const asrOutputExists = await fileExistsInS3(`${fileId}.txt`)
    if (!asrOutputExists) {
      logger.error(`ASR output file ${fileId}.txt does not exist in S3`)
      return {
        success: false,
        message: 'ASR output file does not exist in S3',
      }
    }

    if (resetTimer) {
      const currentAssignment = await prisma.jobAssignment.findFirst({
        where: {
          orderId: orderInformation.id,
          status: 'ACCEPTED',
          type: JobType.QC,
          transcriberId: user.id,
        },
      })
      if (currentAssignment) {
        await prisma.jobAssignment.update({
          where: { id: currentAssignment.id },
          data: { acceptedTs: new Date() },
        })
      } else {
        return {
          success: false,
          message: 'No Accepted QC Assignment found',
        }
      }
    } else {
      await assignFileToQC(
        orderInformation.id,
        OrderStatus.QC_ASSIGNED,
        user.id,
        JobType.QC,
        InputFileType.ASR_OUTPUT,
        fileId,
        'MANUAL'
      )
    }

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
