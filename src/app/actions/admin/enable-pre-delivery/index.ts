'use server'

import logger from '@/lib/logger'
import { updatePreDelivery } from '@/services/admin/verifier-service'

export async function enablePreDelivery(userEmail: string, flag: boolean) {
  try {
    const response = await updatePreDelivery({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating pre delivery status`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
