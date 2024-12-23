'use server'

import logger from '@/lib/logger'
import { updateIndustry } from '@/services/admin/industry-service'

export async function updateUserIndustry(id: string, industry: string) {
  try {
    const response = await updateIndustry({ id, industry })
    return response
  } catch (error) {
    logger.error(`Error while updating industry`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
