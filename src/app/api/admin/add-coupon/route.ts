import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { addUserCoupon } from '@/services/admin/coupon-service'

export async function POST(req: Request) {
  try {
    const { couponCode, discount, validity, userEmail } = await req.json()

    const response = await addUserCoupon({
      couponCode,
      discount,
      validity,
      userEmail,
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while adding coupon`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
