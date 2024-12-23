'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import { checkBraintreeCustomer } from '@/utils/backend-helper'

export async function getClientTokenAction() {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId

  try {
    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const checkBraintreeCustomerExists = await checkBraintreeCustomer(userId)

    const response = await gateway.clientToken.generate(
      checkBraintreeCustomerExists ? { customerId: userId.toString() } : {}
    )

    return {
      success: true,
      clientToken: response.clientToken,
    }
  } catch (error) {
    logger.error(`Failed to generate token for user ${userId}`, error)
    return {
      success: false,
      message: 'Failed to generate token',
    }
  }
}
