'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function getPaypalId() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    const userInfo = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        paypalId: true,
      },
    })

    return { success: true, id: userInfo?.paypalId ?? 'N/A' }
  } catch (error) {
    logger.error(`Error retrieving user paypal ID ${error}`)
    return {
      success: false,
      message: 'Failed to retrieve user paypal ID',
    }
  }
}

export async function updatePaypalId(sessionId: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!sessionId) {
      return {
        success: false,
        message: 'No session ID provided',
      }
    }

    const userInfo = await redis.get(sessionId)
    if (!userInfo) {
      return {
        success: false,
        message: 'User information not found',
      }
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        paypalId: JSON.parse(userInfo).email,
      },
    })

    logger.info(`Updated paypal ID for user ${userId}`)

    return {
      success: true,
      message: 'Successfully updated paypal ID',
    }
  } catch (error) {
    logger.error(`Error updating user paypal ID ${error}`)
    return {
      success: false,
      message: 'Failed to update user paypal ID',
    }
  }
}
