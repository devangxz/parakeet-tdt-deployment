'use server'

import logger from '@/lib/logger'
import { addUserCoupon } from '@/services/admin/coupon-service'

export async function addCoupon(
  couponCode: string,
  discount: number,
  validity: number,
  userEmail: string
) {
  try {
    const response = await addUserCoupon({
      couponCode,
      discount,
      validity,
      userEmail,
    })

    return response
  } catch (error) {
    logger.error(`Error while adding coupon`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
