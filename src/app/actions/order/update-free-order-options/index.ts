'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateFreeOrderOptionsAction(
  invoiceId: string,
  optionId: string,
  value: string
) {
  if (!invoiceId || !optionId) {
    return {
      success: false,
      message: 'Missing required fields',
    }
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return {
        success: false,
        message: 'Invoice not found.',
      }
    }

    let options = JSON.parse(invoice?.options ?? '')

    if (optionId === 'si') {
      options = {
        ...options,
        si: parseInt(value),
      }
    } else if (optionId === 'tmp') {
      options = {
        ...options,
        tmp: parseInt(value),
      }
    } else if (optionId === 'sp') {
      options = {
        ...options,
        sp: value,
      }
    }

    if (optionId === 'instructions') {
      const updatedInvoice = await prisma.invoice.update({
        where: {
          invoiceId: invoiceId,
        },
        data: {
          instructions: value,
        },
      })

      return {
        success: true,
        invoice: updatedInvoice,
        message: 'Instructions updated successfully.',
      }
    }

    const updatedInvoice = await prisma.invoice.update({
      where: {
        invoiceId: invoiceId,
      },
      data: {
        options: JSON.stringify(options),
      },
    })

    return {
      success: true,
      invoice: updatedInvoice,
      message: 'Options updated successfully.',
    }
  } catch (error) {
    logger.error(`Error updating order options for ${invoiceId}`, error)
    return {
      success: false,
      message: 'Error updating order options.',
    }
  }
}
