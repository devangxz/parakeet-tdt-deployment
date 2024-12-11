import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { addFreeCredits } from '@/services/admin/credits-service'

export async function POST(req: Request) {
  try {
    const { amount, userEmail } = await req.json()
    const response = await addFreeCredits({ amount, userEmail })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while adding free credits`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
