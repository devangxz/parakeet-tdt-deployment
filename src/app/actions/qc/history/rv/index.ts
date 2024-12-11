'use server'

import { JobType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import fetchHistoryFiles from '@/services/transcribe-service/legacy-file'

export async function getHistoryRVFiles() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId

    if (!transcriberId) {
      logger.error('User not authenticated')
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    const historyTranscriberFile = await fetchHistoryFiles(
      JobType.RV_LEGACY,
      transcriberId
    )

    logger.info(`History RV files fetched successfully for ${transcriberId}`)
    return {
      success: true,
      data: historyTranscriberFile,
    }
  } catch (error) {
    logger.error('Error fetching history RV files', error)
    return {
      success: false,
      error: 'Failed to fetch history RV files',
    }
  }
}
