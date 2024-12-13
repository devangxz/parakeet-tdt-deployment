'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { getCreditsBalance } from '@/utils/backend-helper'

export async function getCreditBalance() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const creditsBalance = await getCreditsBalance(userId)
    return { success: true, creditsBalance }
  } catch (error) {
    logger.error('Failed to fetch credits balance:', error)
    return {
      success: false,
      message: 'Failed to fetch credits balance',
    }
  }
}
