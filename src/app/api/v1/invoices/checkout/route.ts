/* eslint-disable @typescript-eslint/no-explicit-any */

import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getCreditBalance } from '@/services/payment-service/get-credit-balance'
import { processPayment } from '@/services/payment-service/process-payment'
import {
  checkBraintreeCustomer,
  generateUniqueTransactionId,
} from '@/utils/backend-helper'

const braintreePaymentMethodMapping = {
  paypal_account: 'PAYPAL_ACCOUNT',
  coinbase_account: 'COINBASE_ACCOUNT',
  europe_bank_account: 'EUROPE_BANK_ACCOUNT',
  credit_card: 'CREDIT_CARD',
  apple_pay_card: 'APPLE_PAY_CARD',
  android_pay_card: 'ANDROID_PAY_CARD',
  venmo_account: 'VENMO_ACCOUNT',
  us_bank_account: 'US_BANK_ACCOUNT',
}

const reversedBraintreePaymentMethodMapping = Object.fromEntries(
  Object.entries(braintreePaymentMethodMapping).map(([key, value]) => [
    value,
    key,
  ])
)

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
  const user = await authenticateRequest(req)
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { paymentMethodNonce, invoiceId, orderType } = await req.json()

  const userId = user?.internalTeamUserId || user?.userId
  const userEmail = user?.email

  if (!invoiceId) {
    return NextResponse.json({
      success: false,
      message: 'Invoice ID are required.',
    })
  }

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
  })

  if (!invoice) {
    logger.error(`Invoice not found ${invoiceId}`)
    return NextResponse.json({ message: 'Invoice not found' }, { status: 404 })
  }

  if (invoice.status !== InvoiceStatus.PENDING) {
    logger.error(`Invoice is not pending ${invoiceId}`)
    return NextResponse.json(
      { message: 'Invoice is not pending' },
      { status: 404 }
    )
  }

  const totalAmount = (
    invoice.amount -
    invoice.discount -
    invoice.creditsUsed
  ).toFixed(2)

  const creditBalanceResult = await getCreditBalance(
    user?.userId as number,
    user?.internalTeamUserId as number | null
  )

  if (
    creditBalanceResult.success &&
    creditBalanceResult.creditsBalance >= invoice.amount - invoice.discount
  ) {
    const payViaCreditsResponse = await payViaCredits(
      invoice.invoiceId,
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
  }

  try {
    const checkBraintreeCustomerExists = await checkBraintreeCustomer(
      userId as number
    )

    const result = await gateway.transaction.sale({
      amount: totalAmount,
      orderId: invoiceId,
      paymentMethodNonce: paymentMethodNonce,
      customer: {
        email: userEmail,
        ...(!checkBraintreeCustomerExists ? { id: userId?.toString() } : {}),
      },
      options: {
        submitForSettlement: true,
        ...(!checkBraintreeCustomerExists
          ? { storeInVaultOnSuccess: true }
          : {}),
      },
    })

    if (result.success) {
      await processPayment(
        invoiceId,
        invoice.type,
        orderType,
        result.transaction.id,
        user?.userId as number
      )
      const invoiceData = await prisma.invoice.update({
        where: { invoiceId },
        data: {
          status: InvoiceStatus.PAID,
          transactionId: result.transaction.id,
          paymentMethod:
            result.transaction.paymentInstrumentType ==
            reversedBraintreePaymentMethodMapping.CREDIT_CARD
              ? PaymentMethod.CREDITCARD
              : PaymentMethod.PAYPAL,
          updatedAt: new Date(),
          paidBy: user?.userId,
        },
      })
      logger.info(`Payment successful for invoice ${invoiceId}`)
      const data = {
        success: true,
        transactionId: result.transaction.id,
        paymentMethod:
          result.transaction.paymentInstrumentType ==
          reversedBraintreePaymentMethodMapping.CREDIT_CARD
            ? PaymentMethod.CREDITCARD
            : PaymentMethod.PAYPAL,
        pp_account: `${result.transaction?.paypalAccount?.payerFirstName} ${result.transaction?.paypalAccount?.payerLastName} ${result.transaction?.paypalAccount?.payerEmail}`,
        cc_last4: result.transaction?.creditCard?.last4,
        invoice: invoiceData,
      }
      return NextResponse.json(data)
    } else {
      logger.error(`Payment failed for invoice ${invoiceId}`, result)
      return NextResponse.json({ success: false, message: result.message })
    }
  } catch (error) {
    logger.error(`Failed to charge amount for invoice ${invoiceId}`, error)
    return NextResponse.json({
      success: false,
      message: 'Failed to charge amount',
    })
  }
}
