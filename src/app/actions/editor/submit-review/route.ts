'use server'

import { OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { submitFinalize } from '@/services/editor-service/submit-finalize-file'
import submitReview from '@/services/editor-service/submit-review-file'

export async function submitReviewAction(orderId: number, fileId: string) {
  logger.info('--> submitFinalize')

  try {
    const session = await getServerSession(authOptions)
    const transcriberId = session?.user?.userId as number

    if (!fileId) {
      return {
        success: false,
        error: 'File ID and transcript are required',
      }
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
      },
    })

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      }
    }

    if (order.status === OrderStatus.REVIEWER_ASSIGNED) {
      const { success, message } = await submitReview(transcriberId, order)

      if (!success) {
        return {
          success: false,
          error: message,
        }
      }
    } else {
      const { success, message } = await submitFinalize(transcriberId, order)
      if (!success) {
        return {
          success: false,
          error: message,
        }
      }
    }

    logger.info('<-- submitFinalize')
    return {
      success: true,
      message: 'Review submitted',
    }
  } catch (error) {
    logger.error('Error in submitFinalize:', error)
    return {
      success: false,
      error: 'Internal Server Error',
    }
  }
}
