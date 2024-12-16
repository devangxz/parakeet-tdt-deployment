'use server'

import logger from '@/lib/logger'
import { completeWithdrawal } from '@/services/admin/withdrawal-service'

export async function completeWithdrawalAction(invoiceIds: string[]) {
  try {
    const response = await completeWithdrawal(invoiceIds)
    return response
  } catch (error) {
    logger.error(`Error while completing withdrawal`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
