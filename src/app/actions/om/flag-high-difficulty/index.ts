'use server'

import { OrderStatus, InvoiceType } from '@prisma/client'

import { AUDIO_ISSUES } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import { generateInvoiceId } from '@/utils/backend-helper'

function addHours(date: string | number | Date, hours: number) {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

export async function flagHighDifficulty(formData: {
  orderId: number
  issues: string
  rate: number
  delayPeriod: number
  refundTrigger: number
}) {
  try {
    const { orderId, issues, rate, delayPeriod, refundTrigger } = formData
    const issuesArray = issues.split(',')

    if (!orderId) {
      return {
        success: false,
        message: 'Order Id parameter is required.',
      }
    }

    const orderInformation = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, message: 'Order not found' }
    }

    if (orderInformation.highDifficulty) {
      logger.error(`High difficulty already set for ${orderId}`)
      return {
        success: false,
        message: 'High difficulty already set',
      }
    }

    if (issuesArray.length >= refundTrigger) {
      const order = await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          status: OrderStatus.CANCELLED,
          updatedAt: new Date(),
        },
      })

      const file = await prisma.file.findUnique({
        where: { fileId: orderInformation.fileId },
      })

      const templateData = {
        filename: file?.filename || '',
        url: `https://scribie.ai/payments/paid`,
      }

      await sendTemplateMail(
        'TRANSCRIPT_CANCEL_ORDER',
        order.userId,
        templateData
      )

      logger.info(`rejected the screening file, for ${orderInformation.fileId}`)
    } else {
      const file = await prisma.file.findUnique({
        where: { fileId: orderInformation.fileId },
      })

      if (!file) {
        logger.error(`File not found for ${orderInformation.fileId}`)
        return { success: false, message: 'File not found' }
      }

      const price = ((rate * file.duration) / 60).toFixed(2)

      const invoiceId = generateInvoiceId('CGAP')
      const invoice = await prisma.invoice.create({
        data: {
          invoiceId,
          userId: orderInformation.userId,
          type: InvoiceType.ADDL_PROOFREADING,
          amount: Number(price),
          itemNumber: orderInformation.fileId,
          orderRate: Number(rate.toFixed(2)),
        },
      })

      await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          highDifficulty: true,
          status: OrderStatus.BLOCKED,
          updatedAt: new Date(),
          deadlineTs: addHours(new Date(), delayPeriod),
          delayReason: 'HIGH_DIFFICULTY',
          deliveredTs: addHours(new Date(), delayPeriod),
          comments: issues,
        },
      })

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
        issues: issuesListHtml,
        final_rate: rate.toString(),
        total: price.toString(),
        payment_url: `https://${process.env.SERVER}/payments/pending?id=${invoice?.invoiceId}`,
        file_url: `https://${process.env.SERVER}/files/in-progress`,
      }
      await sendTemplateMail(
        'HIGH_DIFFICULTY',
        orderInformation.userId,
        templateData
      )
    }

    logger.info(
      `set the high difficulty of the file, for ${orderInformation.fileId}`
    )
    return {
      success: true,
      message: 'Successfully set high difficulty',
    }
  } catch (error) {
    logger.error(`Failed to set high difficulty of file`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
