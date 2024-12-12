'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function requestReReviewAction(fileId: string, comment?: string) {
  try {
    if (!fileId) {
      return {
        success: false,
        error: 'File ID is required',
      }
    }

    const order = await prisma.order.findUnique({
      where: { fileId },
    })

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        reReview: true,
        reReviewComment: comment,
      },
    })

    return {
      success: true,
      message: 'Re-Review requested successfully',
    }
  } catch (err) {
    logger.error(
      `An error occurred while processing re-review request for file ${fileId}: ${
        (err as Error).message
      }`
    )
    return {
      success: false,
      error: `An error occurred while processing re-review request`,
    }
  }
}
