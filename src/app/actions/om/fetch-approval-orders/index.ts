'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'

export async function fetchApprovalOrders() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.SUBMITTED_FOR_APPROVAL,
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
        return { ...order, fileCost }
      })
    )

    logger.info(`fetched approval order`)
    return {
      success: true,
      details: ordersWithCost,
    }
  } catch (error) {
    logger.error(`Error while fetching approval orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
