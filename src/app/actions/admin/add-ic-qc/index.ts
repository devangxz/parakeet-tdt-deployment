'use server'

import logger from '@/lib/logger'
import { addICQC } from '@/services/admin/ic-qc-service'

export async function addICQCAction(
  email: string,
  qcRate: number,
  cfRate: number,
  cfRRate: number
) {
  try {
    const response = await addICQC(email, qcRate, cfRate, cfRRate)
    return response
  } catch (error) {
    logger.error('Error adding IC QC', error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
