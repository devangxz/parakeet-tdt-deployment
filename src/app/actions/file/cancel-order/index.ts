'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import { getRefundAmount, getOrderStatus } from '@/utils/backend-helper'

export async function cancelOrderAction(fileId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        fileId,
      },
    })

    if (!orders || orders.length === 0) {
      logger.error(`Order not found for ${fileId}`)
      return {
        success: false,
        message: 'Order not found.',
      }
    }

    const order = orders[0]
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      logger.error(`Order already cancelled for ${fileId}`)
      return {
        success: false,
        message: 'Order already cancelled.',
      }
    }

    const orderProgress = await getOrderStatus(order.id)

    if (!orderProgress) {
      logger.error(`Error fetching order progress for ${fileId}`)
      return {
        success: false,
        message: 'Order not found.',
      }
    }

    if (orderProgress >= 60) {
      logger.info(`Order cannot be cancelled after 60% progress for ${fileId}`)
      return {
        success: false,
        message:
          'Your file has already reached >60% completion and cannot be canceled. Please refer to our cancelation policy for more details.',
      }
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
      url: `https://${process.env.SERVER}/payments/paid?id=${invoiceFile?.invoiceId}`,
    }

    await sendTemplateMail(
      'TRANSCRIPT_CANCEL_ORDER',
      order.userId,
      templateData
    )

    return {
      success: true,
      message: 'Successfully cancelled the order.',
    }
  } catch (error) {
    logger.error(`Error cancelling order`, error)
    return {
      success: false,
      message: 'Error cancelling order.',
    }
  }
}

export async function getRefundAmountAction(fileId: string) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        fileId: fileId,
      },
    })

    if (!orders || orders.length === 0) {
      logger.error(`Order not found for ${fileId}`)
      return {
        success: false,
        s: 'Order not found',
      }
    }

    const order = orders[0]
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      logger.error(`Order already cancelled for ${fileId}`)
      return {
        success: false,
        s: 'Order already cancelled',
      }
    }

    const orderProgress = await getOrderStatus(order.id)

    if (!orderProgress) {
      logger.error(`Error fetching order progress for ${fileId}`)
      return {
        success: false,
        s: 'Order not found',
      }
    }

    if (orderProgress >= 60) {
      logger.info(`Order cannot be cancelled after 60% progress for ${fileId}`)
      return {
        success: false,
        s: 'Your file has already reached >60% completion and cannot be canceled. Please refer to our cancelation policy for more details.',
      }
    }

    const amount = await getRefundAmount(order.fileId)

    if (!amount) {
      logger.error(`Error fetching refund amount for ${fileId}`)
      return {
        success: false,
        s: 'Order not found',
      }
    }

    const totalAmount = parseFloat(amount)
    const refund = (totalAmount - (totalAmount - orderProgress / 100)).toFixed(
      2
    )

    return {
      success: true,
      amount: refund,
    }
  } catch (error) {
    logger.error(`Error getting refund amount`, error)
    return {
      success: false,
      s: 'Error getting refund amount',
    }
  }
}
