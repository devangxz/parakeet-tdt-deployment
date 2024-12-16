'use server'

import logger from '@/lib/logger'
import { changePaypalEmail } from '@/services/admin/paypal-service'

export async function changePaypalEmailAction(
  userEmail: string,
  newEmail: string
) {
  try {
    const response = await changePaypalEmail({ userEmail, newEmail })
    return response
  } catch (error) {
    logger.error(`Error while changing paypal email`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
