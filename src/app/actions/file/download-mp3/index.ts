'use server'

import logger from '@/lib/logger'
import { getDownloadUrl } from '@/services/file-service/download-service'

export async function downloadMp3(fileId: string) {
  try {
    const response = await getDownloadUrl({ fileId })
    return response
  } catch (error) {
    logger.error(`Error while generating download URL`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
