'use server'

import { getServerSession, Session } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { redis } from '@/lib/redis'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function fileCacheTokenAction(sessionData: Session | null = null) {
  try {
    const session = sessionData || (await getServerSession(authOptions))
    const user = session?.user

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    const token = generateUniqueId()

    await redis.set(token, JSON.stringify(user), 'EX', 1800)

    return {
      success: true,
      token,
      message: 'Successfully generated file cache token',
    }
  } catch (error) {
    logger.error('Error getting file cache token', error)
    return {
      success: false,
      message: 'Error getting file cache token',
    }
  }
}
