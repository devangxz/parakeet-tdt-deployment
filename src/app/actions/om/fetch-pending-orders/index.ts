'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'

export async function fetchPendingOrders() {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: {
          notIn: [
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
          ],
        },
      },
      include: {
        File: true,
        Assignment: {
          include: {
            user: true,
          },
        },
      },
    })

    const ordersWithCost = await Promise.all(
      pendingOrders.map(async (order) => {
        const fileCost = await calculateFileCost(order)
        return { ...order, fileCost }
      })
    )

    return {
      success: true,
      details: ordersWithCost,
    }
  } catch (error) {
    logger.error(`Error while fetching pending orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
