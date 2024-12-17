'use server'

import logger from '@/lib/logger'
import { updateLegalQC } from '@/services/admin/legal-qc-service'

export async function addLegalQC(userEmail: string, flag: boolean) {
  try {
    const response = await updateLegalQC({ userEmail, flag })
    return response
  } catch (error) {
    logger.error(`Error while updating legal QC`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
