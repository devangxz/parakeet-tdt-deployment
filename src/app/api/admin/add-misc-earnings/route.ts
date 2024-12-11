import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { addMiscEarnings } from '@/services/admin/misc-earnings-service'

export async function POST(req: Request) {
  try {
    const { transcriberEmail, amount, reason } = await req.json()
    const response = await addMiscEarnings({
      transcriberEmail,
      amount,
      reason,
    })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while adding misc earnings`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
