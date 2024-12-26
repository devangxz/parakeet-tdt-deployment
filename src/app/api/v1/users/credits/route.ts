export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getCreditBalance } from '@/services/payment-service/get-credit-balance'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const creditBalanceResult = await getCreditBalance(
      user?.userId as number,
      user?.internalTeamUserId as number | null
    )
    if (creditBalanceResult.success) {
      logger.info(`Credit balance fetched successfully for user ${user.email}`)
      return NextResponse.json(creditBalanceResult.creditsBalance)
    } else {
      logger.error(`Failed to fetch credit balance for user ${user.email}`)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch credit balance',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Error fetching user credits:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
