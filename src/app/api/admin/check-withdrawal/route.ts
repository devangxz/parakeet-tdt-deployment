export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import { checkWithdrawalStatus } from '@/services/admin/withdrawal-service'

export async function GET(req: NextRequest) {
  try {
    const batchId = req.nextUrl.searchParams.get('batchId')
    if (!batchId) {
      return NextResponse.json({
        success: false,
        s: 'Batch ID is required',
      })
    }

    const response = await checkWithdrawalStatus(batchId)
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while checking withdrawal status`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
