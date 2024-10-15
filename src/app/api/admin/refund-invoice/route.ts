import { InvoiceStatus, JobStatus, InvoiceType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processRefund } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const { invoiceId, amount } = await req.json()

  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found for invoiceId ${invoiceId}`)
      return NextResponse.json({
        success: false,
        message: 'Invoice not found',
      })
    }

    if (invoice.status === InvoiceStatus.PENDING) {
      logger.error(`Invoice is pending for invoiceId ${invoiceId}`)
      return NextResponse.json({
        success: false,
        message: 'Invoice is pending',
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
      logger.error(`Error processing refund for invoice ${invoiceId}`)
      return NextResponse.json({
        success: false,
        message: 'An error occurred. Please try again after some time.',
      })
    }

    if (invoice.type === InvoiceType.TRANSCRIPT) {
      const files = await prisma.invoiceFile.findMany({
        where: {
          invoiceId,
        },
      })
      await prisma.order.updateMany({
        where: {
          fileId: {
            in: files.map((file) => file.fileId),
          },
        },
        data: {
          status: 'REFUNDED',
          updatedAt: new Date(),
        },
      })

      const orders = await prisma.order.findMany({
        where: {
          fileId: {
            in: files.map((file) => file.fileId),
          },
        },
      })

      await prisma.jobAssignment.updateMany({
        where: {
          orderId: {
            in: orders.map((order) => order.id),
          },
        },
        data: {
          status: JobStatus.CANCELLED,
          cancelledTs: new Date(),
        },
      })
    }

    logger.info(`Successfully refunded invoice ${invoiceId}`)

    return NextResponse.json({
      success: true,
      message: 'Refund successfull',
    })
  } catch (error) {
    logger.error(`Error refunding invoice`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
