'use server'

import logger from '@/lib/logger'
import { checkWithdrawalStatus } from '@/services/admin/withdrawal-service'

export async function checkWithdrawalAction(batchId: string) {
  try {
    if (!batchId) {
      return {
        success: false,
        s: 'Batch ID is required',
      }
    }

    const response = await checkWithdrawalStatus(batchId)
    return response
  } catch (error) {
    logger.error(`Error while checking withdrawal status`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
