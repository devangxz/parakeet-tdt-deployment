/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'

export async function GET() {
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

    for (const order of pendingOrders as any) {
      const fileCost = await calculateFileCost(order)
      order.fileCost = fileCost
    }

    return NextResponse.json({
      success: true,
      details: pendingOrders,
    })
  } catch (error) {
    logger.error(`Error while fetching pending orders`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
