'use server'

import logger from '@/lib/logger'
import {
  getAllICQCs,
  getICQCMonthlyHours,
} from '@/services/admin/ic-qc-service'

export async function getICQCsAction() {
  try {
    const response = await getAllICQCs()
    return response
  } catch (error) {
    logger.error('Error getting IC QCs', error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}

export async function getICQCMonthlyHoursAction(userId: number) {
  try {
    const response = await getICQCMonthlyHours(userId)
    return response
  } catch (error) {
    logger.error(`Error getting IC QC monthly hours for user ${userId}`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
