import { InvoiceType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateInvoiceId } from '@/utils/backend-helper'

interface GenerateInvoiceParams {
  type: string
  fileIds: string
  userId: string | number
  rate: number
}

export async function generateInvoice({
  type,
  fileIds,
  userId,
  rate,
}: GenerateInvoiceParams) {
  const minAmount = 1
  let price = 0

  try {
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        itemNumber: fileIds,
        type: type as InvoiceType,
        status: 'PENDING',
      },
    })

    if (existingInvoice) {
      return {
        success: true,
        invoiceId: existingInvoice.invoiceId,
      }
    }

    const files = await prisma.file.findMany({
      where: {
        fileId: {
          in: fileIds.split(','),
        },
      },
    })

    if (files.length === 0) {
      return { success: false, s: 'Files not found' }
    }

    for (const file of files) {
      const amount =
        (file.duration / 60) * rate < minAmount
          ? minAmount
          : (file.duration / 60) * rate
      price += amount
    }

    const invoiceId = generateInvoiceId('CGAP')

    const invoice = await prisma.invoice.create({
      data: {
        invoiceId,
        userId: parseInt(userId as string),
        type: type as InvoiceType,
        amount: price,
        itemNumber: fileIds,
      },
    })

    logger.info(`Invoice generated successfully for ${userId}, ${invoiceId}`)

    return {
      success: true,
      invoiceId: invoice.invoiceId,
    }
  } catch (error) {
    logger.error('Error generating invoice:', error)
    return { success: false, s: 'Failed to generate invoice' }
  }
}
