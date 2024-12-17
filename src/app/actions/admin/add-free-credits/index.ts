'use server'

import logger from '@/lib/logger'
import { addFreeCredits } from '@/services/admin/credits-service'

export async function addUserFreeCredits(amount: number, userEmail: string) {
  try {
    const response = await addFreeCredits({ amount, userEmail })
    return response
  } catch (error) {
    logger.error(`Error while adding free credits`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
