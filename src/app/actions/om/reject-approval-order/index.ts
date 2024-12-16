'use server'

import { OrderStatus, JobStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import unAssignFileFromTranscriber from '@/services/transcribe-service/unassign-file-from-transcriber'

export async function rejectApprovalOrder(formData: { orderId: number }) {
  try {
    const { orderId } = formData

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, message: 'Order not found' }
    }

    const currentJobAssignment = await prisma.jobAssignment.findFirst({
      where: { orderId: order.id, status: JobStatus.SUBMITTED_FOR_APPROVAL },
      include: { user: true },
    })

    if (!currentJobAssignment) {
      logger.error(`No job assignment found for ${orderId}`)
      return {
        success: false,
        message: 'No job assignment found',
      }
    }

    await unAssignFileFromTranscriber(
      Number(orderId),
      currentJobAssignment.id,
      OrderStatus.TRANSCRIBED,
      JobStatus.REJECTED,
      currentJobAssignment.transcriberId,
      order.fileId,
      'QC'
    )

    logger.info(`rejected the approval file, for ${orderId}`)
    return {
      success: true,
      message: 'Successfully rejected',
    }
  } catch (error) {
    logger.error(`Failed to reject approval file`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
