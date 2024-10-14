import { NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const { paymentMethodNonce } = await req.json()

  const userId = user?.internalTeamUserId || user?.userId
  try {
    await gateway.customer.create({ id: userId })

    const result = await gateway.paymentMethod.create({
      customerId: userId.toString(),
      paymentMethodNonce,
      options: { verifyCard: true },
    })

    if (!result.success) {
      logger.error(`Failed to add payment method for user ${userId}`, result)
      return NextResponse.json(
        { success: false, error: 'Failed to add payment method' },
        { status: 500 }
      )
    }

    logger.info(`Add payment method succeeded for user ${userId}`)
    return NextResponse.json({ success: true, message: 'Successfully added' })
  } catch (error) {
    logger.error(`Failed to add payment method for ${userId}`, error)
    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    )
  }
}
