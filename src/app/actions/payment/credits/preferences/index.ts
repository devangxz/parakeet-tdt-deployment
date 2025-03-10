'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface UpdatePreferencesPayload {
  uc: number
  rc: number
}

export async function updateCreditPreferences(
  payload: UpdatePreferencesPayload
) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const selectedId = user?.internalTeamUserId || user?.userId
  try {
    if (!selectedId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const { uc, rc } = payload
    const use_credits_default = uc === 1
    const refund_to_credits = rc === 1

    await prisma.customer.upsert({
      where: { userId: selectedId },
      update: {
        useCreditsDefault: use_credits_default,
        refundToCredits: refund_to_credits,
      },
      create: {
        userId: selectedId,
        useCreditsDefault: use_credits_default,
        refundToCredits: refund_to_credits,
      },
    })

    logger.info(
      `credit preferences updated uc ${use_credits_default}, rc ${refund_to_credits}, user ${selectedId}`
    )

    return {
      success: true,
      message: 'Credit preferences saved successfully',
    }
  } catch (error) {
    logger.error(
      `Error updating credit preferences for user ${selectedId}`,
      error
    )
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
