'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getRefundInvoice(fileId: string) {
  try {
    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: { fileId },
    })

    if (!invoiceFile) {
      return {
        success: false,
        s: 'Invoice not found',
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: invoiceFile.invoiceId },
    })

    if (!invoice) {
      return {
        success: false,
        s: 'Invoice not found',
      }
    }

    return {
      success: true,
      invoiceId: invoice.invoiceId,
    }
  } catch (error) {
    logger.error(`Error while getting the refund invoice`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
