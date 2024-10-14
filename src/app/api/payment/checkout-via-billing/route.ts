import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processPayment } from '@/services/payment-service/process-payment'
import {
  getTeamSuperAdminUserId,
  generateUniqueTransactionId,
} from '@/utils/backend-helper'

export async function POST(request: NextRequest) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

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
    const customerUserId = await getTeamSuperAdminUserId(
      user?.internalTeamUserId,
      user?.userId
    )

    const customerDetails = await prisma.customer.findUnique({
      where: { userId: customerUserId },
    })

    if (!customerDetails) {
      logger.error(`Customer not found for user ${customerUserId}`)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if (!customerDetails.billing) {
      logger.error(`Billing not enabled for user ${customerUserId}`)
      return NextResponse.json(
        { error: 'Billing not enabled' },
        { status: 404 }
      )
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
      logger.error(`Invoice is not pending ${invoiceId}`)
      return NextResponse.json(
        { error: 'Invoice is not pending' },
        { status: 400 }
      )
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
        paymentMethod: PaymentMethod.BILLING,
        updatedAt: new Date(),
        paidBy: user?.userId,
      },
    })
    logger.info(`Payment billing successful for invoice ${invoiceId}`)
    return NextResponse.json({
      success: true,
      transactionId,
      paymentMethod: PaymentMethod.BILLING,
      pp_account: '',
      cc_last4: '',
      invoice: invoiceData,
    })
  } catch (error) {
    logger.error(`Failed billing payment for ${invoiceId}`, error)
    return NextResponse.json(
      { error: 'Failed billing payment' },
      { status: 500 }
    )
  }
}
