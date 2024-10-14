import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const selectedId = user?.internalTeamUserId || user?.userId
  const { uc, rc } = await req.json()
  const use_credits_default = uc === 1 ? true : false
  const refund_to_credits = rc === 1 ? true : false
  try {
    await prisma.customer.update({
      where: { userId: selectedId },
      data: {
        useCreditsDefault: use_credits_default,
        refundToCredits: refund_to_credits,
      },
    })

    logger.info(
      `credit preferences updated uc ${use_credits_default}, rc ${refund_to_credits}, user ${selectedId}`
    )
    return NextResponse.json({
      success: true,
      s: 'Credit preferences saved successfully',
    })
  } catch (error) {
    logger.error(
      `Error updating credit preferences for user ${selectedId}`,
      error
    )
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
