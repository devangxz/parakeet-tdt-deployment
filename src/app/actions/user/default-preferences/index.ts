'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

const customerRoles = [
  'CUSTOMER',
  'ADMIN',
  'INTERNAL_TEAM_USER',
  'SUPERADMIN',
  'CSADMIN',
  'OM',
]

export async function saveDefaultPreferences(
  preferences: Record<string, unknown>,
  recordsPerPage?: number
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    if (!preferences || typeof preferences !== 'object') {
      return {
        success: false,
        message: 'SCB_DEFAULT_ORDER_PREFERENCES_EMPTY',
      }
    }

    const payload = {
      ...preferences,
      userId,
    }

    console.log('payload', payload, preferences)

    const updateNotifyPrefs = customerRoles.includes(user?.role)
      ? prisma.customerNotifyPrefs.upsert({
          where: { userId },
          update: payload,
          create: payload,
        })
      : prisma.transcriberNotifyPrefs.upsert({
          where: { userId },
          update: payload,
          create: payload,
        })

    const updateUser = prisma.user.update({
      where: { id: userId },
      data: { recordsPerPage },
    })

    await prisma.$transaction([updateNotifyPrefs, updateUser])

    return {
      success: true,
      message: 'SCB_DEFAULT_ORDER_PREFERENCES_SUCCESS',
    }
  } catch (err) {
    logger.error(`Error handling default order preferences: ${err}`)
    return {
      success: false,
      message: 'SCB_DEFAULT_ORDER_PREFERENCES_SAVE_FAILED',
    }
  }
}
