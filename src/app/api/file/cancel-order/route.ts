export const dynamic = 'force-dynamic'
import { OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import { getRefundAmount, getOrderStatus } from '@/utils/backend-helper'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get('fileId')
  try {
    const orders = await prisma.order.findMany({
      where: {
        fileId: fileId as string,
      },
    })

    if (!orders || orders.length === 0) {
      logger.error(`Order not found for ${fileId}`)
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 })
    }

    const order = orders[0]
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      logger.error(`Order already cancelled for ${fileId}`)
      return NextResponse.json(
        { message: 'Order already cancelled.' },
        { status: 400 }
      )
    }

    const orderProgress = await getOrderStatus(order.id)

    if (!orderProgress) {
      logger.error(`Error fetching order progress for ${fileId}`)
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 })
    }
    if (orderProgress >= 60) {
      logger.info(`Order cannot be cancelled after 60% progress for ${fileId}`)
      return NextResponse.json({
        success: false,
        message:
          'Your file has already reached >60% completion and cannot be canceled. Please refer to our cancelation policy for more details.',
      })
    }

    const amount = await getRefundAmount(order.fileId)

    if (!amount) {
      logger.error(`Error fetching refund amount for ${fileId}`)
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 })
    }

    const totalAmount = parseFloat(amount)

    const refund = (totalAmount - (totalAmount - orderProgress / 100)).toFixed(
      2
    )

    return NextResponse.json({ success: true, amount: refund }, { status: 200 })
  } catch (error) {
    logger.error(`Error getting refund amount`, error)
    return NextResponse.json(
      { message: 'Error getting refund amount.' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const { fileId } = await req.json()
  try {
    const orders = await prisma.order.findMany({
      where: {
        fileId,
      },
    })

    if (!orders || orders.length === 0) {
      logger.error(`Order not found for ${fileId}`)
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 })
    }

    const order = orders[0]
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      logger.error(`Order already cancelled for ${fileId}`)
      return NextResponse.json(
        { message: 'Order already cancelled.' },
        { status: 400 }
      )
    }

    const orderProgress = await getOrderStatus(order.id)

    if (!orderProgress) {
      logger.error(`Error fetching order progress for ${fileId}`)
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 })
    }
    if (orderProgress >= 60) {
      logger.info(`Order cannot be cancelled after 60% progress for ${fileId}`)
      return NextResponse.json({
        success: false,
        message:
          'Your file has already reached >60% completion and cannot be canceled. Please refer to our cancelation policy for more details.',
      })
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId,
      },
      include: {
        File: true,
      },
    })

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      },
    })

    const templateData = {
      filename: invoiceFile?.File.filename || '',
      url: `https://${process.env.SERVER}/payments?id=${invoiceFile?.invoiceId}`,
    }

    await sendTemplateMail(
      'TRANSCRIPT_CANCEL_ORDER',
      order.userId,
      templateData
    )

    return NextResponse.json('Successfully cancelled the order.', {
      status: 200,
    })
  } catch (error) {
    logger.error(`Error cancelling order`, error)
    return NextResponse.json(
      { message: 'Error cancelling order.' },
      { status: 500 }
    )
  }
}
