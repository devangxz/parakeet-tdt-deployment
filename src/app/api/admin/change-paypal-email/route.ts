import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { changePaypalEmail } from '@/services/admin/paypal-service'

export async function POST(req: Request) {
  try {
    const { userEmail, newEmail } = await req.json()
    const response = await changePaypalEmail({ userEmail, newEmail })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while changing paypal email`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
