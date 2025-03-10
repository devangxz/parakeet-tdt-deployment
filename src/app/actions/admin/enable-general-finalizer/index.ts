'use server'

import logger from '@/lib/logger'
import { updateGeneralFinalizer } from '@/services/admin/verifier-service'

export async function enableGeneralFinalizer(userEmail: string, flag: boolean) {
  try {
    const response = await updateGeneralFinalizer({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating general finalizer`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
