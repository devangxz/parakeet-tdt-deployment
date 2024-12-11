export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { getInitiatedWithdrawals } from '@/services/admin/withdrawal-service'

export async function GET() {
  try {
    const response = await getInitiatedWithdrawals()
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while fetching initiated withdrawals`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
