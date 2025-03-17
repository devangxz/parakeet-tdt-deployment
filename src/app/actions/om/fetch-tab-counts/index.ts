'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface TabCounts {
  pendingCount: number
  screenCount: number
  preDeliveryCount: number
  approvalCount: number
  reReviewCount: number
}

export async function fetchTabCounts(): Promise<{
  success: boolean
  counts?: TabCounts
  message?: string
}> {
  try {
    // Get pending orders count
    const pendingCount = await prisma.order.count({
      where: {
        status: {
          notIn: [
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
            OrderStatus.REFUNDED,
          ],
        },
      },
    })

    // Get screening orders count
    const screenCount = await prisma.order.count({
      where: {
        status: OrderStatus.SUBMITTED_FOR_SCREENING,
      },
    })

    // Get pre-delivery orders count
    const preDeliveryCount = await prisma.order.count({
      where: {
        status: OrderStatus.PRE_DELIVERED,
      },
    })

    // Get approval orders count
    const approvalCount = await prisma.order.count({
      where: {
        status: OrderStatus.SUBMITTED_FOR_APPROVAL,
      },
    })

    // Get re-review orders count
    const reReviewCount = await prisma.order.count({
      where: {
        status: OrderStatus.DELIVERED,
        reReview: true,
      },
    })

    logger.info('Fetched all tab counts successfully')

    return {
      success: true,
      counts: {
        pendingCount,
        screenCount,
        preDeliveryCount,
        approvalCount,
        reReviewCount,
      },
    }
  } catch (error) {
    logger.error('Error fetching tab counts', error)
    return {
      success: false,
      message: 'An error occurred while fetching tab counts',
    }
  }
}
