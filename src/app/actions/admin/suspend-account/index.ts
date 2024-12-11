'use server'

import logger from '@/lib/logger'
import { updateAccountStatus } from '@/services/admin/account-service'

export async function suspendAccount(userEmail: string, flag: boolean) {
  try {
    const response = await updateAccountStatus({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating account status`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
