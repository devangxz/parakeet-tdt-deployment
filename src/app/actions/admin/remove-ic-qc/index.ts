'use server'

import logger from '@/lib/logger'
import { removeICQC } from '@/services/admin/ic-qc-service'

export async function removeICQCAction(userId: number) {
  try {
    const response = await removeICQC(userId)
    return response
  } catch (error) {
    logger.error('Error removing IC QC', error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
