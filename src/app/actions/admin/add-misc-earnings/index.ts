'use server'

import logger from '@/lib/logger'
import { addMiscEarnings } from '@/services/admin/misc-earnings-service'

export async function addMiscEarningsAction(
  transcriberEmail: string,
  amount: number,
  reason: string
) {
  try {
    const response = await addMiscEarnings({
      transcriberEmail,
      amount,
      reason,
    })
    return response
  } catch (error) {
    logger.error(`Error while adding misc earnings`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
