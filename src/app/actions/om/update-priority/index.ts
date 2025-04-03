'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updatePriority(formData: { fileId: string }) {
  try {
    const { fileId } = formData

    if (!fileId) {
      return {
        success: false,
        message: 'File Id parameter is required.',
      }
    }

    const orderInformation = await prisma.order.findFirst({
      where: { fileId: fileId },
    })

    if (!orderInformation) {
      logger.error(`Order not found for file ${fileId}`)
      return {
        success: false,
        message: 'Order not found',
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderInformation.id },
      data: {
        priority: orderInformation.priority + 1,
      },
    })

    logger.info(
      `Priority updated for file ${fileId} to ${updatedOrder.priority}`
    )
    return {
      success: true,
      message: 'Priority updated successfully',
    }
  } catch (error) {
    logger.error(`Failed to update priority`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
