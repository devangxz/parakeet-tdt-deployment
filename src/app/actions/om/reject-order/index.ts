'use server'

import { OrderStatus, JobStatus, OrderType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function rejectOrder(formData: {
  orderId: number
  reasons?: string
  comment?: string
}) {
  try {
    const { orderId, reasons = '', comment = '' } = formData

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, message: 'Order not found' }
    }

    await prisma.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          status:
            order.orderType === OrderType.TRANSCRIPTION_FORMATTING
              ? OrderStatus.FORMATTED
              : order.orderType === OrderType.FORMATTING
              ? OrderStatus.REVIEW_COMPLETED
              : OrderStatus.TRANSCRIBED,
          updatedAt: new Date(),
          comments: `Rejection reasons: ${reasons}${
            comment ? ` | Comments: ${comment}` : ''
          }`,
        },
      })

      await prisma.jobAssignment.updateMany({
        where: { orderId: order.id },
        data: {
          status: JobStatus.REJECTED,
          cancelledTs: new Date(),
          comment: comment ?? '',
        },
      })
    })

    logger.info(`rejected the file, for ${orderId} with reasons: ${reasons}`)
    return {
      success: true,
      message: 'Successfully rejected',
    }
  } catch (error) {
    logger.error(`Failed to reject file`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
