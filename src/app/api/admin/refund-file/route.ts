import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import refundFile from '@/services/file-service/refund-file'

export async function POST(req: Request) {
  const { fileId, amount } = await req.json()

  try {
    const result = await refundFile(fileId, amount)

    return NextResponse.json({
      success: result.success,
      message: result.message,
    })
  } catch (error) {
    logger.error(`Error refunding File`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred while processing refund',
    })
  }
}