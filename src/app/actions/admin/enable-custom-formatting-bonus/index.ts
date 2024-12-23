'use server'

import logger from '@/lib/logger'
import { updateCustomFormattingBonus } from '@/services/admin/qc-service'

export async function enableCustomFormattingBonus(
  userEmail: string,
  flag: boolean
) {
  try {
    const response = await updateCustomFormattingBonus({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating custom formatting bonus`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
