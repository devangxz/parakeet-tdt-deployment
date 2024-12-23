'use server'

import logger from '@/lib/logger'
import { getPendingWithdrawals } from '@/services/admin/withdrawal-service'

export async function getPendingWithdrawalsAction() {
  try {
    const response = await getPendingWithdrawals()
    return response
  } catch (error) {
    logger.error(`Error while fetching pending withdrawals`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
