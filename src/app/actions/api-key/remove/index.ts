'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function removeApiKeyAction() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'Unauthorized',
      }
    }

    await prisma.apiKey.delete({
      where: {
        userId,
      },
    })

    logger.info(`API key removed for user ${userId}`)
    return { success: true, message: 'API key removed successfully' }
  } catch (error) {
    logger.error(`Error removing API key: ${error}`)
    return {
      message: 'Failed to remove API key',
      success: false,
    }
  }
}
