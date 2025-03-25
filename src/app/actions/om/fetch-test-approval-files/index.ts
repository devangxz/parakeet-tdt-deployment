'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import getOrderType from '@/utils/getOrderType'

export async function fetchTestApprovalFiles() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.SUBMITTED_FOR_APPROVAL,
        isTestOrder: true,
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
        const orderType = await getOrderType(order.fileId, order.orderType)
        const transcriberId = order.Assignment.find(
          (a) => a.status === 'SUBMITTED_FOR_APPROVAL' && a.type === 'TEST'
        )?.user.id
        return { ...order, orderType, transcriberId }
      })
    )

    logger.info(`fetched test approval files`)
    return {
      success: true,
      details: ordersWithCost,
    }
  } catch (error) {
    logger.error(`Error while fetching test approval files`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
