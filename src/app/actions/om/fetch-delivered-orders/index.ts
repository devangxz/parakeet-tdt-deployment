'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function fetchDeliveredOrders(date: string) {
  try {
    if (!date) {
      return {
        success: false,
        message: 'Date parameter is required.',
      }
    }

    const deliveredDate = new Date(date)
    const nextDay = new Date(deliveredDate)
    nextDay.setDate(deliveredDate.getDate() + 1)

    const deliveredOrders = await prisma.order.findMany({
      where: {
        deliveredTs: {
          gte: deliveredDate,
          lt: nextDay,
        },
        status: OrderStatus.DELIVERED,
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

    return {
      success: true,
      details: deliveredOrders,
    }
  } catch (error) {
    logger.error(`Error while fetching delivered orders`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
