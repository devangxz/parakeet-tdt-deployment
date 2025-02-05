import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getRefundAmount, getOrderStatus } from '@/utils/backend-helper'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: 'File ID is required' },
        { status: 400 }
      )
    }

    const orders = await prisma.order.findMany({
      where: {
        fileId,
      },
    })

    if (!orders || orders.length === 0) {
      logger.error(`Order not found for ${fileId}`)
      return NextResponse.json(
        { success: false, message: 'Order not found.' },
        { status: 404 }
      )
    }

    const order = orders[0]
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      logger.error(`Order already cancelled for ${fileId}`)
      return NextResponse.json(
        { success: false, message: 'Order already cancelled.' },
        { status: 400 }
      )
    }

    const orderProgress = await getOrderStatus(order.id)

    if (!orderProgress) {
      logger.error(`Error fetching order progress for ${fileId}`)
      return NextResponse.json(
        { success: false, message: 'Order not found.' },
        { status: 404 }
      )
    }

    if (orderProgress >= 60) {
      logger.info(`Order cannot be cancelled after 60% progress for ${fileId}`)
      return NextResponse.json(
        {
          success: false,
          message:
            'Your file has already reached >60% completion and cannot be canceled. Please refer to our cancelation policy for more details.',
        },
        { status: 400 }
      )
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
        status: 'CANCELLED',
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

    return NextResponse.json(
      { success: true, message: 'Successfully cancelled the order.' },
      { status: 200 }
    )
  } catch (error) {
    logger.error(`Error cancelling order`, error)
    return NextResponse.json(
      { success: false, message: 'Error cancelling order.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({
        success: false,
        message: 'File ID is required',
      })
    }

    const orders = await prisma.order.findMany({
      where: {
        fileId: fileId,
      },
    })

    if (!orders || orders.length === 0) {
      logger.error(`Order not found for ${fileId}`)
      return NextResponse.json({ success: false, message: 'Order not found' })
    }

    const order = orders[0]
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      logger.error(`Order already cancelled for ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'Order already cancelled',
      })
    }

    const orderProgress = await getOrderStatus(order.id)

    if (!orderProgress) {
      logger.error(`Error fetching order progress for ${fileId}`)
      return NextResponse.json({ success: false, message: 'Order not found' })
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
      return NextResponse.json({ success: false, message: 'Order not found' })
    }

    const totalAmount = parseFloat(amount)

    return NextResponse.json({ success: true, amount: totalAmount })
  } catch (error) {
    logger.error(`Error getting refund amount`, error)
    return NextResponse.json(
      { success: false, message: 'Error getting refund amount' },
      { status: 500 }
    )
  }
}
