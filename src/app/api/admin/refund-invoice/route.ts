import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { refundInvoice } from '@/services/admin/refund-invoice-service'

export async function POST(req: Request) {
  try {
    const { invoiceId, amount } = await req.json()
    const response = await refundInvoice({ invoiceId, amount })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while refunding invoice`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
