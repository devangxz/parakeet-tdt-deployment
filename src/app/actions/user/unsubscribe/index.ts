'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function unsubscribeUserFromNewsletter(email: string) {
  try {
    if (!email) {
      return {
        success: false,
        message: 'Email is required',
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'Something went wrong',
      }
    }

    const userId = user.id
    const customerRoles = [
      'CUSTOMER',
      'ADMIN',
      'INTERNAL_TEAM_USER',
      'SUPERADMIN',
      'CSADMIN',
      'OM',
    ]

    if (customerRoles.includes(user.role)) {
      await prisma.customerNotifyPrefs.upsert({
        where: { userId },
        update: { newsletter: false },
        create: {
          userId,
          newsletter: false,
        },
      })
    } else {
      await prisma.transcriberNotifyPrefs.upsert({
        where: { userId },
        update: { newsletter: false },
        create: {
          userId,
          newsletter: false,
        },
      })
    }

    logger.info(`User ${email} has been unsubscribed from the newsletter`)

    return {
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter',
    }
  } catch (error) {
    logger.error(`Error unsubscribing user: ${error}`)
    return {
      success: false,
      message: 'Failed to process your unsubscribe request',
    }
  }
}
