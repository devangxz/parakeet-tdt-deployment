'use server'

import logger from '@/lib/logger'
import { toggleArchive } from '@/services/file-service'

export async function archiveFileAction(fileId: string) {
  try {
    const response = await toggleArchive({ fileId, archive: true })
    return response
  } catch (error) {
    logger.error(`Error while archiving file`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
