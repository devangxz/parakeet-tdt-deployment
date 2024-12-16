'use server'

import logger from '@/lib/logger'
import { renameFile } from '@/services/file-service'

export async function renameFileAction(fileId: string, newName: string) {
  try {
    const response = await renameFile({ fileId, newName })
    return response
  } catch (error) {
    logger.error(`Error while renaming file`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
