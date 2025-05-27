import { OrderStatus, JobStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getRefundAmount, processRefund } from '@/utils/backend-helper'

interface RefundResult {
  success: boolean
  message: string
  refundDetails?: {
    fileName: string
    amount: number
    invoiceId: string
  }
}

async function refundFile(
  fileId: string,
  amount?: number,
  isPartialRefund: boolean = false
): Promise<RefundResult> {
  try {
    const file = await prisma.file.findUnique({
      where: { fileId },
      select: { filename: true },
    })
    if (!file) {
      logger.error(`File not found ${fileId}`)
      return {
        success: false,
        message: 'File not found',
      }
    }

    const order = await prisma.order.findFirst({
      where: { fileId },
    })
    if (!order) {
      logger.error(`Order not found for file ${fileId}`)
      return {
        success: false,
        message: 'Order not found for file',
      }
    }

    const refundAmount = await getRefundAmount(fileId)
    if (!refundAmount) {
      logger.error(`Error getting refund amount for file ${fileId}`)
      return {
        success: false,
        message: 'Error calculating refund amount',
      }
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: { fileId },
    })
    if (!invoiceFile) {
      logger.error(`Invoice not found for file ${fileId}`)
      return {
        success: false,
        message: 'Invoice not found for file',
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
    })
    if (!invoice) {
      logger.error(`Invoice not found for file ${fileId}`)
      return {
        success: false,
        message: 'Invoice not found for file',
      }
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: invoice.userId,
      },
    })

    const finalRefundAmount = Number(amount || refundAmount)
    const processRefundResult = await processRefund(
      invoice.transactionId as string,
      finalRefundAmount,
      invoice.invoiceId,
      customer?.refundToCredits ?? false
    )
    if (!processRefundResult) {
      logger.error(`Error processing refund for file ${fileId}`)
      return {
        success: false,
        message: 'Failed to process refund',
      }
    }

    const orderInfo = await prisma.order.findUnique({
      where: { fileId },
    })
    if (!orderInfo) {
      logger.error(`Order not found for file ${fileId}`)
      return {
        success: false,
        message: 'Order not found for file',
      }
    }

    const totalAmountAfterRefund =
      invoice.amount - finalRefundAmount - invoice.discount

    logger.info(
      `Total amount after refund ${totalAmountAfterRefund} for file ${fileId}`
    )

    if (!isPartialRefund) {
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
    }

    logger.info(`Successfully refunded file ${fileId}`)
    return {
      success: true,
      message: 'Refund successful',
      refundDetails: {
        fileName: file.filename,
        amount: finalRefundAmount,
        invoiceId: invoice.invoiceId,
      },
    }
  } catch (error) {
    logger.error(`Error refunding File`, error)
    return {
      success: false,
      message: 'An error occurred while processing refund',
    }
  }
}

export default refundFile
