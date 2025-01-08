'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getTranscriberBonusDetails() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId

    if (!transcriberId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const bonusDetails = await prisma.bonus.findMany({
      where: {
        userId: transcriberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    logger.info(`Fetched bonus details for ${transcriberId}`)
    return {
      success: true,
      bonusDetails,
    }
  } catch (error) {
    logger.error(`Failed to fetch bonus details: ${error}`)
    return {
      success: false,
      message: 'Failed to fetch bonus details',
    }
  }
}
