import { Role, CouponType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface AddCouponParams {
  couponCode: string
  discount: number
  validity: number
  userEmail: string
}

export async function addUserCoupon({
  couponCode,
  discount,
  validity,
  userEmail,
}: AddCouponParams) {
  if (!isValidEmail(userEmail)) {
    logger.error(`Invalid email: ${userEmail}`)
    return { success: false, s: 'Invalid email' }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: userEmail.toLowerCase(),
    },
  })

  if (!user) {
    logger.error(`User not found with email ${userEmail}`)
    return { success: false, s: 'User not found' }
  }

  if (user.role !== Role.CUSTOMER) {
    logger.error(`User is not a customer: ${userEmail}`)
    return { success: false, s: 'User is not a customer' }
  }

  if (discount <= 0) {
    logger.error(`Invalid discount: ${discount}`)
    return { success: false, s: 'Invalid discount' }
  }

  if (!validity) {
    logger.error(`Invalid validity: ${validity}`)
    return { success: false, s: 'Invalid validity' }
  }

  const existingCoupon = await prisma.coupon.findUnique({
    where: {
      couponCode: couponCode,
    },
  })

  if (existingCoupon) {
    logger.error(`Coupon already exists: ${couponCode}`)
    return { success: false, s: 'Coupon already exists' }
  }

  try {
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
    return { success: true, couponCode }
  } catch (error) {
    logger.error('Error creating coupon:', error)
    return { success: false, s: 'Failed to create coupon' }
  }
}
