'use server'

import logger from '@/lib/logger'
import { getMonitorDetails } from '@/services/admin/monitor-service'

export async function getMonitorDetailsAction() {
  try {
    const response = await getMonitorDetails()
    return response
  } catch (error) {
    logger.error(`Error while getting monitor details`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
