'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { getWorkspaces } from '@/services/team-service/get-workspaces'

export async function fetchWorkspaces() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const workspaces = await getWorkspaces(userId)
    return {
      success: true,
      data: workspaces,
    }
  } catch (error) {
    logger.error('Error fetching workspaces:', error)
    return {
      success: false,
      message: 'SCB_FETCH_WORKSPACES_FAILED',
    }
  }
}
