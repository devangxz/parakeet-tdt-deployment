'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function setPlayStatsAction({
  fileId,
  listenCount,
  editedSegments
}: {
  fileId: string
  listenCount: number[]
  editedSegments: number[]
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const userId = session.user.userId

    await prisma.playStats.upsert({
      where: {
        userId_fileId: {
          userId,
          fileId
        }
      },
      create: {
        userId,
        fileId,
        listenCount,
        editedSegments
      },
      update: {
        listenCount,
        editedSegments,
        updatedAt: new Date()
      }
    })

    return { success: true }
  } catch (err) {
    logger.error(
      `Failed to save play stats for file ${fileId}: ${(err as Error).message}`
    )
    return { success: false, error: 'Failed to save play stats' }
  }
}