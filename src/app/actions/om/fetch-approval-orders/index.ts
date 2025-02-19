'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'

const getUserWatchList = async (customerId: number, transcriberId: number) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerId },
  })
  const transcriber = await prisma.verifier.findUnique({
    where: { userId: transcriberId },
  })
  return {
    customer: customer?.watch ?? false,
    transcriber: transcriber?.watchlist ?? false,
  }
}

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
        const transcriberId = order.Assignment.find(
          (a) => a.status === 'SUBMITTED_FOR_APPROVAL' && a.type === 'QC'
        )?.user.id
        const watchList = await getUserWatchList(
          order.userId,
          transcriberId ?? 0
        )
        return { ...order, fileCost, watchList }
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
