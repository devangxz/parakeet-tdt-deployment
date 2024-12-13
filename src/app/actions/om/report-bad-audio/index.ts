'use server'

import { OrderStatus, ReportMode, ReportOption } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function reportBadAudio(formData: {
  fileId: string
  comments: string
  reportOption: string
}) {
  try {
    const { fileId, comments, reportOption } = formData

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
      data: {
        status: OrderStatus.SUBMITTED_FOR_SCREENING,
        updatedAt: new Date(),
        reportComment: comments,
        reportMode: ReportMode.OM,
        reportOption: reportOption as ReportOption,
      },
    })

    logger.info(`reported bad audio, for ${fileId}`)
    return {
      success: true,
      message: 'Successfully reported',
    }
  } catch (error) {
    logger.error(`Failed to report bad audio`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
