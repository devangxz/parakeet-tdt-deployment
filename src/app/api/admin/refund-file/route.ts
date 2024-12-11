import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { refundFile } from '@/services/admin/refund-service'

export async function POST(req: Request) {
  try {
    const { fileId, amount } = await req.json()
    const response = await refundFile({ fileId, amount })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while refunding file`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
