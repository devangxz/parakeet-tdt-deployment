import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { orderFiles } from '@/services/order-service'
import { getCreditBalance } from '@/services/payment-service/get-credit-balance'
import { processPayment } from '@/services/payment-service/process-payment'
import { generateUniqueTransactionId } from '@/utils/backend-helper'
import { payViaBraintree } from '@/utils/payViaBraintree'

const payViaCredits = async (
  invoiceId: string,
  orderType: string,
  userId: number
) => {
  const transactionId = generateUniqueTransactionId()

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
  })

  if (!invoice) {
    return {
      success: false,
      message: 'Invoice not found',
    }
  }

  const totalAmount = (invoice.amount - invoice.discount).toFixed(2)

  const creditsUsed = parseFloat(totalAmount)

  await processPayment(
    invoiceId,
    invoice.type,
    orderType,
    transactionId,
    userId
  )

  const invoiceData = await prisma.invoice.update({
    where: { invoiceId },
    data: {
      status: InvoiceStatus.PAID,
      transactionId,
      paymentMethod: PaymentMethod.CREDITS,
      updatedAt: new Date(),
      creditsUsed,
      paidBy: userId,
    },
  })

  return {
    success: true,
    transactionId,
    paymentMethod: PaymentMethod.CREDITS,
    pp_account: '',
    cc_last4: '',
    invoice: invoiceData,
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { fileIds, orderType, onlyInvoice } = await req.json()

    if (!fileIds || !orderType) {
      return NextResponse.json(
        { message: 'File IDs and order type are required' },
        { status: 400 }
      )
    }

    const userId = user.internalTeamUserId || user.userId
    const customPlan = user?.customPlan as unknown as boolean

    const invoiceResponse = await orderFiles(
      userId,
      user.internalTeamUserId,
      fileIds,
      orderType,
      customPlan
    )

    if (!invoiceResponse.success) {
      return NextResponse.json(
        { message: invoiceResponse.message },
        { status: 500 }
      )
    }

    if (onlyInvoice) {
      return NextResponse.json(invoiceResponse)
    }
    const creditBalanceResult = await getCreditBalance(
      user?.userId as number,
      user?.internalTeamUserId as number | null
    )

    if (
      creditBalanceResult.success &&
      creditBalanceResult.creditsBalance >= (invoiceResponse.totalAmount || 0)
    ) {
      const payViaCreditsResponse = await payViaCredits(
        invoiceResponse.inv ?? '',
        orderType,
        user?.userId
      )
      if (payViaCreditsResponse.success) {
        return NextResponse.json(payViaCreditsResponse)
      } else {
        return NextResponse.json(
          { message: payViaCreditsResponse.message },
          { status: 500 }
        )
      }
    } else {
      const payViaBraintreeResponse = await payViaBraintree(
        invoiceResponse.inv ?? '',
        orderType,
        userId,
        user?.email,
        user?.userId
      )

      if (payViaBraintreeResponse.success) {
        return NextResponse.json(payViaBraintreeResponse)
      } else {
        return NextResponse.json(
          { message: payViaBraintreeResponse.message },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    logger.error('Error processing order:', error)
    return NextResponse.json(
      { message: 'Error processing order' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: {
        userId: user.userId,
      },
    })

    return NextResponse.json({
      success: true,
      data: orders.map((order) => ({
        orderId: order.id,
        fileId: order.fileId,
        status: order.status,
        orderType: order.orderType,
        createdAt: order.createdAt,
        deliveryTime: order.deliveryTs,
        instructions: order.instructions,
      })),
    })
  } catch (error) {
    logger.error(`Failed to get invoices: ${error}`)
  }
}
