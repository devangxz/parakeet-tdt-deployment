export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import { checkTranscriberPayment } from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get('batchId')

  try {
    const checkStatus = await checkTranscriberPayment(batchId as string)
    if (!checkStatus) {
      logger.error(`Error checking batch status`)
      return NextResponse.json({
        success: false,
        message: 'Batch status failed, pls check batchId',
      })
    }

    logger.info(`Batch status checked successfully`)
    return NextResponse.json({
      success: true,
      details: checkStatus,
    })
  } catch (error) {
    logger.error(`Error checking batch payment status`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
