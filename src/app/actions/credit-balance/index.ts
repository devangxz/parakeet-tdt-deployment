'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { getCreditBalance } from '@/services/payment-service/get-credit-balance'

export async function getCreditBalanceAction() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    const creditBalanceResult = await getCreditBalance(
      user?.userId as number,
      user?.internalTeamUserId as number | null
    )

    if (creditBalanceResult.success) {
      return {
        success: true,
        creditsBalance: creditBalanceResult.creditsBalance,
      }
    } else {
      return {
        success: false,
        message: 'Failed to fetch credit balance',
      }
    }
  } catch (error) {
    logger.error('Error fetching credit balance:', error)
    return {
      success: false,
      message: 'Internal server error',
    }
  }
}
