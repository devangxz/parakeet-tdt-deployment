'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import gateway from '@/lib/braintree'
import logger from '@/lib/logger'

interface AddPaymentMethodPayload {
  paymentMethodNonce: string
}

export async function addPaymentMethod(payload: AddPaymentMethodPayload) {
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

    await gateway.customer.create({ id: userId.toString() })

    const result = await gateway.paymentMethod.create({
      customerId: userId.toString(),
      paymentMethodNonce: payload.paymentMethodNonce,
      options: { verifyCard: true },
    })

    if (!result.success) {
      logger.error(`Failed to add payment method for user ${userId}`, result)
      return {
        success: false,
        message: 'Failed to add payment method',
      }
    }

    logger.info(`Add payment method succeeded for user ${userId}`)
    return {
      success: true,
      message: 'Successfully added',
    }
  } catch (error) {
    logger.error(`Failed to add payment method`, error)
    return {
      success: false,
      message: 'Failed to add payment method',
    }
  }
}
