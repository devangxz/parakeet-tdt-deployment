'use server'

import logger from '@/lib/logger'
import { redis } from '@/lib/redis'

export async function getUserInfo(sessionId: string) {
  try {
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

    return {
      success: true,
      user: JSON.parse(userInfo),
    }
  } catch (error) {
    logger.error(`Error retrieving user info ${error}`)
    return {
      success: false,
      message: 'Failed to retrieve user info',
    }
  }
}
