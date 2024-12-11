import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { generateInvoice } from '@/services/admin/invoice-service'

export async function POST(req: Request) {
  try {
    const { type, fileIds, userId, rate } = await req.json()
    const response = await generateInvoice({ type, fileIds, userId, rate })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while generating invoice`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
