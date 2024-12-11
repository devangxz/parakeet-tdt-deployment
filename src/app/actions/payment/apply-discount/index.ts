'use server'

import { InvoiceStatus, CouponType } from '@prisma/client'
import dayjs from 'dayjs'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface ApplyDiscountPayload {
  invoiceId: string
  couponCode: string
}

export async function applyDiscount(payload: ApplyDiscountPayload) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const { invoiceId, couponCode } = payload

    if (!invoiceId || !couponCode) {
      return {
        success: false,
        message: 'Invoice ID and coupon code are required.',
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return {
        success: false,
        message: 'Invoice not found.',
      }
    }

    const { status, amount } = invoice
    if (status !== InvoiceStatus.PENDING) {
      logger.error(
        `Attempt to use discount coupon on ${status} invoice ${invoiceId}, ${userId}`
      )
      return {
        success: false,
        message:
          'Discount coupon cannot be applied for this invoice. Please cancel this order first.',
      }
    }

    const coupon = await prisma.coupon.findUnique({
      where: {
        couponCode,
        activated: true,
      },
    })

    if (!coupon) {
      logger.error(
        `Attempt to use non-existent coupon ${couponCode}, ${userId}`
      )
      return {
        success: false,
        message: `The '${couponCode}' coupon was not found.`,
      }
    }

    const { type, userId: couponUserId, createdAt } = coupon
    const applyCount = coupon.applyCount || 0
    const discountRate = coupon.discountRate || 1
    const validDays = coupon.validDays || 1
    const currentDate = dayjs()
    const couponExpiryDate = dayjs(createdAt).add(validDays, 'days')

    if (currentDate.isAfter(couponExpiryDate)) {
      logger.error(`Attempt to use expired coupon ${couponCode}, ${userId}`)
      return {
        success: false,
        message: `The '${couponCode}' coupon has expired.`,
      }
    }

    if (
      (type === CouponType.USER && couponUserId !== userId) ||
      (type === CouponType.ONE_TIME && applyCount > 0)
    ) {
      logger.error(
        `Attempt to use invalid or expired coupon ${couponCode}, ${userId}`
      )
      return {
        success: false,
        message: `The '${couponCode}' coupon was not found.`,
      }
    }

    const totalDiscount = Math.round(amount * discountRate * 100) / 100

    await prisma.$transaction(async (prisma) => {
      await prisma.invoice.updateMany({
        where: {
          invoiceId,
          status: InvoiceStatus.PENDING,
        },
        data: {
          discount: totalDiscount,
        },
      })

      await prisma.coupon.update({
        where: { couponCode },
        data: { applyCount: { increment: 1 } },
      })
    })

    logger.info(
      `Coupon ${couponCode} applied, discount ${discountRate}, ${invoiceId}, ${userId}`
    )

    return {
      success: true,
      totalDiscount,
    }
  } catch (error) {
    logger.error(
      `Error applying discount coupon for ${payload.invoiceId}`,
      error
    )
    return {
      success: false,
      message: 'Error applying discount coupon.',
    }
  }
}
