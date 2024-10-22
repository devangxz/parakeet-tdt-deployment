/* eslint-disable @typescript-eslint/no-explicit-any */
import { OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'
import serializeBigInt from '@/utils/serializeBigInt'

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PRE_DELIVERED,
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

    for (const order of orders as any) {
      const fileCost = await calculateFileCost(order)
      order.fileCost = fileCost
    }

    logger.info(`fetched pre delivery order`)

    const serializedData = serializeBigInt(orders)

    return NextResponse.json({
      success: true,
      details: serializedData,
    })
  } catch (error) {
    logger.error(`Error while fetching pre delivery orders`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
