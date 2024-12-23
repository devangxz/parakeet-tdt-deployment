'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function acceptScreenFile(orderId: number) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return {
        success: false,
        message: 'Order not found',
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.TRANSCRIBED, updatedAt: new Date() },
    })

    logger.info(`accepted the screening file, for ${orderId}`)
    return {
      success: true,
      message: 'Successfully accepted',
    }
  } catch (error) {
    logger.error(`Failed to accept screened file`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
