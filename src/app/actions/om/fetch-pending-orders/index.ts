/* eslint-disable @typescript-eslint/no-unused-vars */
'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'
import getOrderType from '@/utils/getOrderType'

export async function fetchPendingOrders() {
  try {
    // Fetch all pending orders with needed relations in a single query
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: {
          notIn: [
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
          ],
        },
        isTestOrder: false,
      },
      include: {
        File: true,
        Assignment: {
          include: {
            user: true,
          },
        },
        user: {
          select: {
            id: true,
            splInstructions: true,
            Organization: true,
          },
        },
      },
    })

    // Batch fetch all file cancellations for these orders in a single query
    const fileIds = pendingOrders.map((order) => order.fileId)
    const allCancellations = await prisma.cancellations.findMany({
      where: {
        fileId: { in: fileIds },
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

    // Create a map for quick cancellations lookup by fileId
    const cancellationsMap = new Map()
    allCancellations.forEach((cancellation) => {
      const fileId = cancellation.fileId
      if (!cancellationsMap.has(fileId)) {
        cancellationsMap.set(fileId, [])
      }
      cancellationsMap.get(fileId).push(cancellation)
    })

    // Process all orders in parallel with the pre-fetched data
    const processedOrders = await Promise.all(
      pendingOrders.map(async (order) => {
        const fileCost = await calculateFileCost(order)
        const orderType = await getOrderType(order.fileId, order.orderType)

        // Use the pre-fetched data instead of individual queries
        const orgName = order.user?.Organization?.name || ''
        const specialInstructions = order.user?.splInstructions || ''
        const cancellations = cancellationsMap.get(order.fileId) || []

        // Create a new object without the user property
        const { user, ...orderWithoutUser } = order

        return {
          ...orderWithoutUser,
          fileCost,
          orgName,
          specialInstructions,
          orderType,
          cancellations,
        }
      })
    )

    return {
      success: true,
      details: processedOrders,
    }
  } catch (error) {
    logger.error(`Error while fetching pending orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
