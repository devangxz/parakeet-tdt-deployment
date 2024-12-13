'use server'

import logger from '@/lib/logger'
import { transferFiles } from '@/services/admin/account-service'

export async function transferFilesAction(
  userEmail: string,
  fileIdsString: string
) {
  try {
    const fileIds = fileIdsString.split(',')
    const response = await transferFiles({ userEmail, fileIds })
    return response
  } catch (error) {
    logger.error(`Error while transferring files`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
