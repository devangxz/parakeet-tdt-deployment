export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'

import { getCreditsBalance } from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const selectedId = user?.internalTeamUserId || user?.userId

  try {
    const creditsBalance = await getCreditsBalance(selectedId)
    return NextResponse.json({ success: true, creditsBalance })
  } catch (error) {
    console.error('Failed to fetch credits balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits balance' },
      { status: 500 }
    )
  }
}
