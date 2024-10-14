import { OrderStatus, JobStatus, OrderType } from '@prisma/client'
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

    await prisma.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          status:
            order.orderType === OrderType.TRANSCRIPTION_FORMATTING
              ? OrderStatus.FORMATTED
              : OrderStatus.TRANSCRIBED,
          updatedAt: new Date(),
        },
      })

      await prisma.jobAssignment.updateMany({
        where: { orderId: order.id },
        data: { status: JobStatus.REJECTED, cancelledTs: new Date() },
      })
    })

    logger.info(`rejected the file, for ${orderId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully rejected',
    })
  } catch (error) {
    logger.error(`Failed to reject file`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
