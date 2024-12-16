'use server'

import logger from '@/lib/logger'
import { refundInvoice } from '@/services/admin/refund-invoice-service'

export async function refundInvoiceAction(invoiceId: string, amount: number) {
  try {
    const response = await refundInvoice({ invoiceId, amount })
    return response
  } catch (error) {
    logger.error(`Error while refunding invoice`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
