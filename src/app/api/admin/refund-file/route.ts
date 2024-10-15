import { OrderStatus, JobStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getRefundAmount, processRefund } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const { fileId, amount } = await req.json()

  try {
    const order = await prisma.order.findFirst({
      where: {
        fileId: fileId,
      },
    })

    if (order?.status === 'DELIVERED') {
      logger.error(`File is already delivered ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'File is already delivered',
      })
    }

    const refundAmount = await getRefundAmount(fileId)

    if (!refundAmount) {
      logger.error(`Error getting refund amount for file ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'An error occurred. Please try again after some time.',
      })
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId: fileId,
      },
    })

    if (!invoiceFile) {
      logger.error(`Invoice not found for file ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'Invoice not found for file',
      })
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found for file ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'Invoice not found for file',
      })
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: invoice.userId,
      },
    })

    const processRefundResult = await processRefund(
      invoice.transactionId as string,
      Number(amount),
      invoice.invoiceId,
      customer?.refundToCredits ?? false
    )

    if (!processRefundResult) {
      logger.error(`Error processing refund for file ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'An error occurred. Please try again after some time.',
      })
    }

    const orderInfo = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
    })

    if (!orderInfo) {
      logger.error(`Order not found for file ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'Order not found for file',
      })
    }

    await prisma.order.update({
      where: {
        id: orderInfo.id,
      },
      data: {
        status: OrderStatus.REFUNDED,
        updatedAt: new Date(),
      },
    })

    await prisma.jobAssignment.updateMany({
      where: {
        orderId: orderInfo.id,
      },
      data: {
        status: JobStatus.CANCELLED,
        cancelledTs: new Date(),
      },
    })

    logger.info(`Successfully refunded file ${fileId}`)

    return NextResponse.json({
      success: true,
      message: 'Refund successfull',
    })
  } catch (error) {
    logger.error(`Error refunding File`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
