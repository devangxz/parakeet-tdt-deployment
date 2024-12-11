'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import gateway from '@/lib/braintree'
import logger from '@/lib/logger'

interface RemovePaymentMethodPayload {
  token: string
}

export async function removePaymentMethod(payload: RemovePaymentMethodPayload) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId

  if (!userId) {
    return {
      success: false,
      message: 'User not authenticated',
    }
  }

  try {
    await gateway.paymentMethod.delete(payload.token)

    logger.info(`Payment method removed successfully for user ${userId}`)
    return {
      success: true,
      message: 'Successfully removed payment method',
    }
  } catch (error) {
    logger.error(`Failed to remove payment method for ${userId}`, error)
    return {
      success: false,
      message: 'Failed to remove payment method',
    }
  }
}
