import { InvoiceType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateInvoiceId } from '@/utils/backend-helper'

interface GenerateInvoiceParams {
  type: string
  fileIds: string
  userEmail: string
  rate: number
}

export async function generateInvoice({
  type,
  fileIds,
  userEmail,
  rate,
}: GenerateInvoiceParams) {
  const minAmount = 1
  let price = 0

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
    })

    if (!user) {
      return { success: false, s: 'User not found' }
    }

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
        userId: user.id,
        type: type as InvoiceType,
        amount: price,
        itemNumber: fileIds,
      },
    })

    logger.info(`Invoice generated successfully for ${user.id}, ${invoiceId}`)

    return {
      success: true,
      invoiceId: invoice.invoiceId,
    }
  } catch (error) {
    logger.error('Error generating invoice:', error)
    return { success: false, s: 'Failed to generate invoice' }
  }
}
