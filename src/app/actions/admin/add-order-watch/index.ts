'use server'

import logger from '@/lib/logger'
import { updateOrderWatch } from '@/services/admin/order-watch-service'

export async function updateOrderWatchAction(userEmail: string, flag: boolean) {
  try {
    const response = await updateOrderWatch({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating order watch`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
