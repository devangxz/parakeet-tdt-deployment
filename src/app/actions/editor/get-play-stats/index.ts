'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getPlayStatsAction(fileId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const userId = session.user.userId

    const stats = await prisma.playStats.findUnique({
      where: {
        userId_fileId: {
          userId,
          fileId
        }
      }
    })

    return { success: true, data: stats }
  } catch (err) {
    logger.error(
      `Failed to get play stats for file ${fileId}: ${(err as Error).message}`
    )
    return { success: false, error: 'Failed to get play stats' }
  }
}