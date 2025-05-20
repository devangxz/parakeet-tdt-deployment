'use server'

import { OrderStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'

export async function rejectScreenFile(formData: {
  orderId: number
  reasons?: string
  comment?: string
}) {
  try {
    const { orderId, reasons, comment } = formData

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, message: 'Order not found' }
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId: order.fileId,
      },
      include: {
        File: true,
      },
    })

    // Format the rejection comments
    const rejectionComment = reasons
      ? `Rejection Reasons: ${reasons}${
          comment ? `\nAdditional Comments: ${comment}` : ''
        }`
      : comment || ''

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
        comments: rejectionComment,
      },
    })

    const templateData = {
      filename: invoiceFile?.File.filename || '',
      url: `https://${process.env.SERVER}/payments/pending?id=${invoiceFile?.invoiceId}`,
    }

    await sendTemplateMail(
      'TRANSCRIPT_CANCEL_ORDER',
      order.userId,
      templateData
    )

    logger.info(
      `rejected the screening file, for ${order.fileId}, reasons: ${
        reasons || 'none'
      }, comment: ${comment || 'none'}`
    )
    return {
      success: true,
      message: 'Successfully rejected',
    }
  } catch (error) {
    logger.error(`Failed to reject screened file`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
