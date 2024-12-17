'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function changeDeliveryDate(orderId: number, days: number) {
  try {
    if (!orderId) {
      return {
        success: false,
        message: 'Order Id parameter is required.',
      }
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      select: { deliveryTs: true, fileId: true, deadlineTs: true },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, message: 'Order not found' }
    }

    const deliveryTs = new Date(
      order.deliveryTs.getTime() + days * 24 * 60 * 60 * 1000
    )

    await prisma.order.update({
      where: { id: Number(orderId) },
      data: { deliveryTs, updatedAt: new Date() },
    })

    logger.info(
      `Delivery of ${
        order.fileId
      } postponed to ${deliveryTs.toLocaleDateString()}`
    )
    return {
      success: true,
      newDeliveryDate: deliveryTs.toLocaleDateString(),
    }
  } catch (error) {
    logger.error(`Failed to update delivery`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
