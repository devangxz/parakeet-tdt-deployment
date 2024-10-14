import { OrderStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return NextResponse.json({ success: false, message: 'Order not found' })
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.TRANSCRIBED, updatedAt: new Date() },
    })

    logger.info(`accepted the screening file, for ${orderId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully accepted',
    })
  } catch (error) {
    logger.error(`Failed to accept screened file`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
