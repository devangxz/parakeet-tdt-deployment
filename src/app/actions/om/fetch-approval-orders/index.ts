'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'
import getOrderType from '@/utils/getOrderType'

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

export async function fetchApprovalOrders(
  page: number = 1,
  pageSize: number = 10
) {
  try {
    // Base where condition
    const whereCondition = {
      status: OrderStatus.SUBMITTED_FOR_APPROVAL,
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: whereCondition,
    })

    // Calculate pagination parameters
    const skip = (page - 1) * pageSize
    const take = pageSize

    const orders = await prisma.order.findMany({
      where: whereCondition,
      include: {
        File: true,
        Assignment: {
          include: {
            user: true,
          },
        },
      },
      skip,
      take,
      orderBy: {
        deliveryTs: 'asc',
      },
    })

    // Sort orders by delivery date with yesterday's orders first
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    orders.sort((a, b) => {
      const aDelivery = new Date(a.deliveryTs)
      aDelivery.setHours(0, 0, 0, 0)
      const bDelivery = new Date(b.deliveryTs)
      bDelivery.setHours(0, 0, 0, 0)

      const aOverdue = aDelivery.getTime() === yesterday.getTime()
      const bOverdue = bDelivery.getTime() === yesterday.getTime()

      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return a.id - b.id
    })

    const ordersWithCost = await Promise.all(
      orders.map(async (order) => {
        const fileCost = await calculateFileCost(order)
        const orderType = await getOrderType(order.fileId, order.orderType)
        const transcriberId = order.Assignment.find(
          (a) => a.status === 'SUBMITTED_FOR_APPROVAL' && a.type === 'QC'
        )?.user.id
        const watchList = await getUserWatchList(
          order.userId,
          transcriberId ?? 0
        )

        const qcValidationStats = await prisma.qCValidationStats.findFirst({
          where: {
            orderId: order.id,
            fileId: order.fileId,
            transcriberId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        return {
          ...order,
          fileCost,
          watchList,
          orderType,
          qcValidationStats,
        }
      })
    )

    logger.info(`Fetched approval orders: page ${page}, pageSize ${pageSize}`)
    return {
      success: true,
      details: ordersWithCost,
      pagination: {
        totalCount,
        pageCount: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize,
      },
    }
  } catch (error) {
    logger.error(`Error while fetching approval orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
