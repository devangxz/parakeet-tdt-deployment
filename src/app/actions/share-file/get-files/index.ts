'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { getSharedFiles } from '@/services/file-service/get-files'

export async function getFiles() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user) {
      logger.error('User not authenticated')
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    const response = await getSharedFiles(
      user.internalTeamUserId || user.userId
    )

    logger.info(`Shared files fetched successfully for ${user.email}`)
    return response
  } catch (error) {
    logger.error('Error fetching shared files', error)
    return {
      success: false,
      error: 'Failed to fetch shared files',
    }
  }
}
