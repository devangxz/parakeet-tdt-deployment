import { InvoiceStatus, CouponType } from '@prisma/client'
import dayjs from 'dayjs'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId
  const { invoiceId, couponCode } = await request.json()

  if (!invoiceId || !couponCode) {
    return NextResponse.json(
      { message: 'Invoice ID and coupon code are required.' },
      { status: 400 }
    )
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json(
        { success: false, message: 'Invoice not found.' },
        { status: 404 }
      )
    }

    const { status, amount } = invoice
    if (status !== InvoiceStatus.PENDING) {
      logger.error(
        `Attempt to use discount coupon on ${status} invoice ${invoiceId}, ${userId}`
      )
      return NextResponse.json(
        {
          success: false,
          message:
            'Discount coupon cannot be applied for this invoice. Please cancel this order first.',
        },
        { status: 400 }
      )
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
      return NextResponse.json(
        {
          success: false,
          message: `The '${couponCode}' coupon was not found.`,
        },
        { status: 400 }
      )
    }

    const { type, userId: couponUserId, createdAt } = coupon
    const applyCount = coupon.applyCount || 0
    const discountRate = coupon.discountRate || 1
    const validDays = coupon.validDays || 1
    const currentDate = dayjs()
    const couponExpiryDate = dayjs(createdAt).add(validDays, 'days')

    if (currentDate.isAfter(couponExpiryDate)) {
      logger.error(`Attempt to use expired coupon ${couponCode}, ${userId}`)
      return NextResponse.json(
        {
          success: false,
          message: `The '${couponCode}' coupon has expired.`,
        },
        { status: 400 }
      )
    }

    if (
      (type === CouponType.USER && couponUserId !== userId) ||
      (type === CouponType.ONE_TIME && applyCount > 0)
    ) {
      logger.error(
        `Attempt to use invalid or expired coupon ${couponCode}, ${userId}`
      )
      return NextResponse.json(
        {
          success: false,
          message: `The '${couponCode}' coupon was not found.`,
        },
        { status: 400 }
      )
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

    return NextResponse.json({ totalDiscount: totalDiscount })
  } catch (error) {
    logger.error(`Error applying discount coupon for ${invoiceId}`, error)
    return NextResponse.json(
      { success: false, message: 'Error applying discount coupon.' },
      { status: 500 }
    )
  }
}
