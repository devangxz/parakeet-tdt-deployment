'use server'

import logger from '@/lib/logger'
import { refundFile } from '@/services/admin/refund-service'

export async function refundFileAction(fileId: string, amount: number) {
  try {
    const response = await refundFile({ fileId, amount })
    return response
  } catch (error) {
    logger.error(`Error while refunding file`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
