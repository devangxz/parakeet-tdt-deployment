'use server'

import logger from '@/lib/logger'
import { generateInvoice } from '@/services/admin/invoice-service'

interface GenerateInvoiceParams {
  type: string
  fileIds: string
  userEmail: string
  rate: number
}

export async function generateInvoiceAction({
  type,
  fileIds,
  userEmail,
  rate,
}: GenerateInvoiceParams) {
  try {
    const response = await generateInvoice({ type, fileIds, userEmail, rate })
    return response
  } catch (error) {
    logger.error(`Error while generating invoice`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
