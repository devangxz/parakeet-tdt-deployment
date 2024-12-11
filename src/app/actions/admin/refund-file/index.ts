'use server'

import logger from '@/lib/logger'
import refundFile from '@/services/file-service/refund-file'

export async function refundFileAction(fileId: string, amount: number) {
  try {
    const result = await refundFile(fileId, amount)
    return {
      success: result.success,
      message: result.message,
    }
  } catch (error) {
    logger.error(`Error while refunding file`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
