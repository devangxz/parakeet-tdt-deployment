'use server'

import { OrderStatus } from '@prisma/client'

import { AUDIO_ISSUES } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import refundFile from '@/services/file-service/refund-file'

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

    const refundResult = await refundFile(order.fileId)
    if (!refundResult.success) {
      logger.error(`Failed to refund file ${order.fileId}`)
      return {
        success: false,
        message: 'Failed to refund file',
      }
    }

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.REFUNDED,
        updatedAt: new Date(),
        comments: rejectionComment,
      },
    })

    const issuesArray = reasons ? reasons.split(',') : []

    const issuesListHtml = `<ul>${issuesArray
      .map((key) => {
        const issue = AUDIO_ISSUES[key.trim() as keyof typeof AUDIO_ISSUES]
        if (!issue) return ''
        const longText =
          issue.long.charAt(0).toUpperCase() + issue.long.slice(1)
        return `<li>${longText} (eg. ${issue.example})</li>`
      })
      .join('')}</ul>`

    const templateData = {
      filename: invoiceFile?.File.filename || '',
      url: `https://${process.env.SERVER}/payments/paid?id=${invoiceFile?.invoiceId}`,
      reasons: issuesListHtml,
    }

    await sendTemplateMail(
      'TRANSCRIPT_ORDER_REFUND',
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
