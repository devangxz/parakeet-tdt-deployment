'use server'

import logger from '@/lib/logger'
import { updateCustomFormattingReview } from '@/services/admin/verifier-service'

export async function enableCustomFormattingReview(
  userEmail: string,
  flag: boolean
) {
  try {
    const response = await updateCustomFormattingReview({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating custom formatting review`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
