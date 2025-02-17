/* eslint-disable @typescript-eslint/no-unused-vars */
import { InvoiceType, OrderStatus, OrderType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance, sendTemplateMail } from '@/lib/ses'
import { getEmailDetails } from '@/utils/backend-helper'

const addHours = (date: string | number | Date, hours: number) => {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

export const processPayment = async (
  invoiceId: string,
  type: string,
  orderType: string,
  transactionId: string,
  paidBy: number
) => {
  const ses = getAWSSesInstance()
  try {
    if (type === InvoiceType.TRANSCRIPT) {
      const invoice = await prisma.invoice.findUnique({
        where: { invoiceId },
      })

      if (!invoice) {
        logger.error(`Invoice not found ${invoiceId}`)
        return false
      }

      const file_ids = invoice.itemNumber?.split(',') ?? []
      let instructions = invoice.instructions
      const invoiceOptions = JSON.parse(invoice.options ?? '{}')
      for (const fileId of file_ids) {
        const tatHours = invoiceOptions.exd == 1 ? 12 : 24
        if (orderType === OrderType.TRANSCRIPTION_FORMATTING) {
          const file = await prisma.file.findUnique({
            where: {
              fileId,
            },
          })

          if (file) {
            const fileInfo = JSON.parse(file.customInstructions ?? '{}')
            if (fileInfo && fileInfo.instructions) {
              instructions = fileInfo.instructions
            }
          }
        }
        await prisma.order.upsert({
          where: {
            fileId,
          },
          create: {
            userId: invoice.userId,
            fileId,
            status: OrderStatus.PENDING,
            priority: 0,
            tat: tatHours,
            deadlineTs: addHours(new Date(), tatHours),
            deliveryTs: addHours(new Date(), tatHours),
            instructions: instructions,
            orderType: orderType as OrderType,
          },
          update: {
            status: OrderStatus.PENDING,
            orderTs: new Date(),
            deadlineTs: addHours(new Date(), tatHours),
            deliveryTs: addHours(new Date(), tatHours),
            instructions: instructions,
          },
        })
      }
      const getEmails = await getEmailDetails(invoice.userId, paidBy)
      if (!getEmails) {
        logger.error(`Emails not found for user ${invoice.invoiceId}`)
        return true
      }
      const emailData = {
        userEmailId: getEmails.email || '',
      }

      const instructionData = { userEmailId: 'support@scribie.com' }

      const fileInfo = await prisma.invoiceFile.findMany({
        where: {
          invoiceId,
        },
        include: {
          File: true,
        },
      })
      let body = ''
      fileInfo.forEach((file, index) => {
        body += '<tr>'
        body += `<td style='text-align:center;border:1px solid #cccccc;padding:5px' align='center' border='1' cellpadding='5'>${
          index + 1
        }</td>`
        body += `<td style='text-align:left;border:1px solid #cccccc;padding:5px' align='left' border='1' cellpadding='5'><a target='_blank' href='https://${process.env.SERVER}/files/permalink/${file.fileId}'>${file.File.filename}</a></td>`
        body += `<td style='text-align:center;border:1px solid #cccccc;padding:5px' align='center' border='1' cellpadding='5'>${new Date(
          file.createdAt
        ).toLocaleDateString()}</td>`
        body += `<td style='text-align:center;border:1px solid #cccccc;padding:5px' align='center' border='1' cellpadding='5'>$${file.price.toFixed(
          2
        )}</td>`
        body += '</tr>'
      })

      const templateData = {
        file_url: `https://${process.env.SERVER}/files/permalink/${invoice.itemNumber}`,
        rate_name: 'Manual (24 hours)',
        transaction_id: transactionId,
        payment_url: `https://${process.env.SERVER}/payments?id=${invoice.invoiceId}`,
        invoice_id: invoice.invoiceId,
        disclaimer:
          'Additional charges may apply for files with non-American accents, poor audio quality, distortions, distant speakers, high background and/or ambient noise. A full refund will be issued if the additional charges is unacceptable, or if the file is un-transcribeable.',
        files: body,
      }

      await ses.sendMail('ORDER_CONFIRMATION', emailData, templateData)
      if (instructions) {
        await ses.sendMail('SEND_INSTRUCTIONS', instructionData, {
          Instructions: instructions,
          customerEmail: getEmails.email || '',
          fileIds: invoice.itemNumber ?? '',
          invoiceId: invoice.invoiceId,
        })
      }
    }
    if (type === InvoiceType.ADD_CREDITS) {
      const invoice = await prisma.invoice.findUnique({
        where: { invoiceId },
      })

      if (!invoice) {
        logger.error(`Invoice not found ${invoiceId}`)
        return false
      }
      const templateData = {
        amount: invoice.amount.toFixed(2),
      }
      await sendTemplateMail('ADD_CREDITS', invoice.userId, templateData)
    }
    if (
      type === InvoiceType.ADDL_FORMATTING ||
      type === InvoiceType.ADDL_PROOFREADING
    ) {
      const invoice = await prisma.invoice.findUnique({
        where: { invoiceId },
      })

      if (!invoice) {
        logger.error(`Invoice not found ${invoiceId}`)
        return false
      }
      const file_ids = invoice.itemNumber?.split(',') ?? []
      for (const fileId of file_ids) {
        await prisma.order.update({
          where: {
            fileId,
          },
          data: {
            status: OrderStatus.TRANSCRIBED,
            updatedAt: new Date(),
            highDifficulty: false,
            deliveryTs: addHours(new Date(), 24),
          },
        })
      }
    }
    return true
  } catch (error) {
    logger.error(`Failed to create order for ${invoiceId}`, error)
    return false
  }
}
