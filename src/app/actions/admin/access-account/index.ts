'use server'

import logger from '@/lib/logger'
import { accessAccount } from '@/services/admin/account-access'

export async function switchUserAccount(userEmail: string) {
  try {
    const response = await accessAccount(userEmail)
    return response
  } catch (error) {
    logger.error(`Error occurred while switching user to ${userEmail}`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
