import { Role, CouponType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

export async function POST(req: Request) {
  const { couponCode, discount, validity, userEmail } = await req.json()
  try {
    if (!isValidEmail(userEmail)) {
      logger.error(`Invalid email: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'Invalid email' })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User not found' })
    }

    if (user.role !== Role.CUSTOMER) {
      logger.error(`User is no  t a customer: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User is not a customer' })
    }

    if (discount <= 0) {
      logger.error(`Invalid discount: ${discount}`)
      return NextResponse.json({ success: false, s: 'Invalid discount' })
    }

    if (!validity) {
      logger.error(`Invalid validity: ${validity}`)
      return NextResponse.json({ success: false, s: 'Invalid validity' })
    }

    const existingCoupon = await prisma.coupon.findUnique({
      where: {
        couponCode: couponCode,
      },
    })

    if (existingCoupon) {
      logger.error(`Coupon already exists: ${couponCode}`)
      return NextResponse.json({ success: false, s: 'Coupon already exists' })
    }

    await prisma.coupon.create({
      data: {
        couponCode,
        discountRate: discount,
        validDays: validity,
        userId: user.id,
        type: CouponType.USER,
        activated: true,
      },
    })

    logger.info(`coupon added successfully for user ${user.email}`)

    return NextResponse.json({
      success: true,
      couponCode,
    })
  } catch (error) {
    logger.error(`Error while adding coupon`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
