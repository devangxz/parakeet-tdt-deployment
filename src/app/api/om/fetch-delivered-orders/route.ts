export const dynamic = 'force-dynamic'
import { OrderStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date')

    if (!date) {
      return NextResponse.json({
        success: false,
        message: 'Date parameter is required.',
      })
    }

    const deliveredDate = new Date(date as string)
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

    return NextResponse.json({
      success: true,
      details: deliveredOrders,
    })
  } catch (error) {
    logger.error(`Error while fetching delivered orders`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
