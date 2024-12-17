'use server'

import logger from '@/lib/logger'
import { getInitiatedWithdrawals } from '@/services/admin/withdrawal-service'

export async function getInitiatedWithdrawalsAction() {
  try {
    const response = await getInitiatedWithdrawals()
    return response
  } catch (error) {
    logger.error(`Error while fetching initiated withdrawals`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
