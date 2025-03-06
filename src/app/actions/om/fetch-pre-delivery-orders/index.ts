'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'
import getOrderType from '@/utils/getOrderType'

export async function fetchPreDeliveryOrders() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PRE_DELIVERED,
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
      orders.map(async (order) => {
        const fileCost = await calculateFileCost(order)
        const orderType = await getOrderType(order.fileId, order.orderType)
        return { ...order, fileCost, orderType }
      })
    )

    logger.info(`fetched pre delivery order`)

    return {
      success: true,
      details: ordersWithCost,
    }
  } catch (error) {
    logger.error(`Error while fetching pre delivery orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
