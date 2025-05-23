'use server'

import { OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export interface HighDifficultyFile {
  fileId: string
  filename: string
  reasons: string
}

export async function getHighDifficultyFiles() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId
    const highDifficultyOrders = await prisma.order.findMany({
      where: {
        highDifficulty: true,
        status: OrderStatus.BLOCKED,
        userId: userId,
      },
      include: {
        File: {
          select: {
            fileId: true,
            filename: true,
          },
        },
      },
    })

    if (!highDifficultyOrders.length) {
      return {
        success: true,
        files: [],
      }
    }

    const files: HighDifficultyFile[] = highDifficultyOrders
      .filter((order) => order.File !== null)
      .map((order) => ({
        fileId: order.File!.fileId,
        filename: order.File!.filename,
        reasons: order.comments || '',
      }))

    return {
      success: true,
      files,
    }
  } catch (error) {
    logger.error('Failed to fetch high difficulty files', error)
    return {
      success: false,
      message: 'Failed to fetch high difficulty files',
      files: [],
    }
  }
}
