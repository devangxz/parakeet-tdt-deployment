'use server'

import logger from '@/lib/logger'
import { updateACRReview } from '@/services/admin/verifier-service'

export async function enableACRReview(userEmail: string, flag: boolean) {
  try {
    const response = await updateACRReview({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating ACR review`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
