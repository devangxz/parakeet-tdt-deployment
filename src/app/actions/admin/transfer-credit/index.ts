'use server'

import logger from '@/lib/logger'
import { transferCredit } from '@/services/admin/account-service'

export async function transferCreditAction(invd: string, em: string) {
  try {
    const response = await transferCredit({ invd, em })
    return response
  } catch (error) {
    logger.error(`Error while transferring credit`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
