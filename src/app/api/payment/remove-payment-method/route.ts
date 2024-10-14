import { NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const { token } = await req.json()

  const userId = user?.internalTeamUserId || user?.userId
  try {
    await gateway.paymentMethod.delete(token)

    logger.info(`Payment method removed successfully for user ${userId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully removed payment method',
    })
  } catch (error) {
    logger.error(`Failed to add payment method for ${userId}`, error)
    return NextResponse.json(
      { error: 'Failed to add payment method' },
      { status: 500 }
    )
  }
}
