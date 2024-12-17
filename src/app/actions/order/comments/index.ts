'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getOrderComments(fileId: string) {
  try {
    const order = await prisma.order.findFirst({
      where: { fileId },
      select: { comments: true },
    })

    if (!order) {
      return {
        success: false,
        message: 'Order not found.',
      }
    }

    return {
      success: true,
      comments: order.comments,
    }
  } catch (err) {
    logger.error(`Failed to retrieve comments for file: ${fileId}`)
    return {
      success: false,
      message: 'Error retrieving comments',
    }
  }
}

export async function updateOrderComments(fileId: string, comments: string) {
  try {
    const orderExist = await prisma.order.update({
      where: { fileId },
      data: {
        comments,
      },
    })

    if (!orderExist) {
      return {
        success: false,
        message: `Order Not Found for file: ${fileId}`,
      }
    }

    logger.info('<-- orderComments')
    return {
      success: true,
      message: 'Thank you for your comments',
    }
  } catch (err) {
    logger.error(`Failed to add comments for file: ${fileId}`)
    return {
      success: false,
      message: 'Cannot submit your comments',
    }
  }
}
