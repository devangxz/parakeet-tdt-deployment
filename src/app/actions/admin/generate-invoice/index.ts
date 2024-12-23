'use server'

import logger from '@/lib/logger'
import { generateInvoice } from '@/services/admin/invoice-service'

interface GenerateInvoiceParams {
  type: string
  fileIds: string
  userId: string
  rate: number
}

export async function generateInvoiceAction({
  type,
  fileIds,
  userId,
  rate,
}: GenerateInvoiceParams) {
  try {
    const response = await generateInvoice({ type, fileIds, userId, rate })
    return response
  } catch (error) {
    logger.error(`Error while generating invoice`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
