'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'
import getOrgName from '@/utils/getOrgName'

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
        const orgName = await getOrgName(order.userId)
        return { ...order, fileCost, orgName }
      })
    )

    // Fetch cancellations for each order's file and add to ordersWithCost 
    const ordersWithCostAndCancellations = await Promise.all(
      ordersWithCost.map(async (order) => {
        const cancellations = await prisma.cancellations.findMany({
          where: {
            fileId: order.fileId
          },
          include: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                email: true
              }
            }
          }
        })
        return { ...order, cancellations }
      })
    )

    return {
      success: true,
      details: ordersWithCostAndCancellations,
    }
  } catch (error) {
    logger.error(`Error while fetching pending orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
