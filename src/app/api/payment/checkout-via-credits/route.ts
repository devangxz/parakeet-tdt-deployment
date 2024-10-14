import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processPayment } from '@/services/payment-service/process-payment'
import {
  getCreditsBalance,
  generateUniqueTransactionId,
} from '@/utils/backend-helper'

export async function POST(request: NextRequest) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId

  const { invoiceId, orderType } = await request.json()

  if (!invoiceId || !orderType) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invoice ID and order type are required.',
      },
      { status: 400 }
    )
  }

  try {
    const creditsBalance = await getCreditsBalance(userId)

    if (creditsBalance <= 0) {
      logger.error(
        `rejecting attempt to apply credits with ${creditsBalance} to ${invoiceId}`
      )

      return NextResponse.json({
        success: false,
        error: 'Credits cannot be applied as your account credit balance is 0',
      })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json({
        success: false,
        error: 'Invoice not found',
      })
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
      logger.error(`Invoice is not pending ${invoiceId}`)
      return NextResponse.json({
        success: false,
        error: 'Invoice is not pending',
      })
    }

    const totalAmount = (invoice.amount - invoice.discount).toFixed(2)

    const creditsUsed = parseFloat(totalAmount)

    if (creditsUsed > creditsBalance) {
      logger.error(
        `rejecting attempt to apply credits with ${creditsBalance} to ${invoiceId}`
      )

      return NextResponse.json({
        success: false,
        error:
          'Credits cannot be applied as your account credit balance is lesser than total amount',
      })
    }

    const transactionId = generateUniqueTransactionId()
    await processPayment(
      invoiceId,
      invoice.type,
      orderType,
      transactionId,
      user?.userId
    )

    const invoiceData = await prisma.invoice.update({
      where: { invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        transactionId,
        paymentMethod: PaymentMethod.CREDITS,
        updatedAt: new Date(),
        creditsUsed,
        paidBy: user?.userId,
      },
    })
    logger.info(`Payment credits successful for invoice ${invoiceId}`)
    return NextResponse.json({
      success: true,
      transactionId,
      paymentMethod: PaymentMethod.CREDITS,
      pp_account: '',
      cc_last4: '',
      invoice: invoiceData,
    })
  } catch (error) {
    logger.error(`Failed charged credits payment for ${invoiceId}`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to charge credits payment',
      },
      { status: 500 }
    )
  }
}
