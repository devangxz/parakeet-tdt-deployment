'use server'

import logger from '@/lib/logger'
import { updateQCStatus } from '@/services/admin/qc-service'

export async function disableQC(userEmail: string, flag: boolean) {
  try {
    const response = await updateQCStatus({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating QC status`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
