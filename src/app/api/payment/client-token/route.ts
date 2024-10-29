export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import { checkBraintreeCustomer } from '@/utils/backend-helper'

export async function GET(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId
  try {
    const checkBraintreeCustomerExists = await checkBraintreeCustomer(userId)
    if (!checkBraintreeCustomerExists) {
      const response = await gateway.clientToken.generate({})
      return NextResponse.json({ clientToken: response.clientToken })
    } else {
      const response = await gateway.clientToken.generate({
        customerId: userId.toString(),
      })
      return NextResponse.json({ clientToken: response.clientToken })
    }
  } catch (error) {
    logger.error(`Failed to generate token for user ${userId}`, error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
