'use server'

import logger from '@/lib/logger'
import { updateInstructions } from '@/services/admin/instructions-service'

export async function addInstructions(id: string, instructions: string) {
  try {
    const response = await updateInstructions({ id, instructions })
    return response
  } catch (error) {
    logger.error(`Error while updating instructions`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
