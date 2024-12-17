'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getTranscriberMiscEarnings() {
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

    const earningDetails = await prisma.miscEarnings.findMany({
      where: {
        userId: transcriberId,
      },
    })

    logger.info(`Fetched misc earnings details for ${transcriberId}`)
    return {
      success: true,
      earningDetails,
    }
  } catch (error) {
    logger.error(`Failed to fetch misc earnings: ${error}`)
    return {
      success: false,
      message: 'Failed to fetch misc earnings',
    }
  }
}
