'use server'

import logger from '@/lib/logger'
import { initiateWithdrawal } from '@/services/admin/withdrawal-service'

export async function initiateWithdrawalAction(invoiceIds: string[]) {
  try {
    const response = await initiateWithdrawal(invoiceIds)
    return response
  } catch (error) {
    logger.error(`Error while initiating withdrawal`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
