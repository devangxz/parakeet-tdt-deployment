import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { completeWithdrawal } from '@/services/admin/withdrawal-service'

export async function POST(req: Request) {
  try {
    const { invoiceIds } = await req.json()
    const response = await completeWithdrawal(invoiceIds)
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while completing withdrawal`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
