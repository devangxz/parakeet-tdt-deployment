'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'
import getOrderType from '@/utils/getOrderType'
import getOrgName from '@/utils/getOrgName'

const getSpecialInstructions = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  })

  return user?.splInstructions ?? ''
}

export async function fetchPendingOrders(
  page: number = 1,
  pageSize: number = 10
) {
  try {
    // Base where condition
    const whereCondition = {
      status: {
        notIn: [
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
          OrderStatus.REFUNDED,
        ],
      },
      isTestOrder: false,
    }

    // Get total count for pagination
    const totalCount = await prisma.order.count({
      where: whereCondition,
    })

    // Calculate pagination parameters
    const skip = (page - 1) * pageSize
    const take = pageSize

    const pendingOrders = await prisma.order.findMany({
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
        deliveryTs: 'asc', // First sort by delivery date
      },
    })

    // Sort orders so that overdue files from yesterday are placed on top
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    pendingOrders.sort((a, b) => {
      const aDelivery = new Date(a.deliveryTs)
      aDelivery.setHours(0, 0, 0, 0)
      const bDelivery = new Date(b.deliveryTs)
      bDelivery.setHours(0, 0, 0, 0)

      const aOverdue = aDelivery.getTime() === yesterday.getTime()
      const bOverdue = bDelivery.getTime() === yesterday.getTime()

      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      return 0
    })

    const ordersWithCost = await Promise.all(
      pendingOrders.map(async (order) => {
        const fileCost = await calculateFileCost(order)
        const orgName = await getOrgName(order.userId)
        const specialInstructions = await getSpecialInstructions(order.userId)
        const orderType = await getOrderType(order.fileId, order.orderType)
        return { ...order, fileCost, orgName, specialInstructions, orderType }
      })
    )

    // Fetch cancellations for each order's file and add to ordersWithCost
    const ordersWithCostAndCancellations = await Promise.all(
      ordersWithCost.map(async (order) => {
        const cancellations = await prisma.cancellations.findMany({
          where: {
            fileId: order.fileId,
          },
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true,
              },
            },
          },
        })
        return { ...order, cancellations }
      })
    )

    return {
      success: true,
      details: ordersWithCostAndCancellations,
      pagination: {
        totalCount,
        pageCount: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize,
      },
    }
  } catch (error) {
    logger.error(`Error while fetching pending orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
