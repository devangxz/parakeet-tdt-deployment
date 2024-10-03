export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import { getCreditBalance } from '@/services/payment-service/get-credit-balance'

export async function GET(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')

    const creditBalanceResult = await getCreditBalance(
      user.userId,
      user.internalTeamUserId
    )

    if (creditBalanceResult.success) {
      const response = NextResponse.json({
        success: true,
        creditsBalance: creditBalanceResult.creditsBalance,
      })
      response.headers.delete('x-user-token')
      return response
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch credit balance' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error fetching credit balance:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
