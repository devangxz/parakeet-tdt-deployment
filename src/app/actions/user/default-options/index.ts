'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function saveDefaultOptions(options: Record<string, unknown>) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    if (!options || typeof options !== 'object') {
      return {
        success: false,
        message: 'Invalid options',
      }
    }

    logger.info('--> defaultOrderOptions')

    const optionsString = JSON.stringify(options)
    await prisma.defaultOption.upsert({
      where: { userId },
      update: { options: optionsString },
      create: { userId, options: optionsString },
    })

    return {
      success: true,
      message: 'SCB_DEFAULT_ORDER_OPTIONS_SUCCESS',
    }
  } catch (err) {
    logger.error(`Error handling default order options: ${err}`)
    return {
      success: false,
      message: 'SCB_DEFAULT_ORDER_OPTIONS_FAILED',
    }
  }
}
