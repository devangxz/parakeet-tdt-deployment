'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function createApiKeyAction() {
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

    const apiKey = generateUniqueId()

    await prisma.apiKey.upsert({
      where: {
        userId,
      },
      update: {
        apiKey,
      },
      create: {
        userId,
        apiKey,
      },
    })

    logger.info(`API key generated for user ${userId}`)
    return { apiKey, success: true }
  } catch (error) {
    logger.error(`Error generating API key: ${error}`)
    return {
      message: 'Failed to generate API key',
      success: false,
    }
  }
}
