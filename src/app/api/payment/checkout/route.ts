import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processPayment } from '@/services/payment-service/process-payment'
import { checkBraintreeCustomer } from '@/utils/backend-helper'

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

export async function POST(request: NextRequest) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId
  const userEmail = user?.email

  const { paymentMethodNonce, invoiceId, orderType } = await request.json()

  if (!paymentMethodNonce || !invoiceId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Payment method nonce and invoice ID are required.',
      },
      { status: 400 }
    )
  }

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
  })

  if (!invoice) {
    logger.error(`Invoice not found ${invoiceId}`)

    return NextResponse.json(
      { success: false, message: 'Invoice not found' },
      { status: 404 }
    )
  }

  if (invoice.status !== InvoiceStatus.PENDING) {
    logger.error(`Invoice is not pending ${invoiceId}`)

    return NextResponse.json(
      { success: false, message: 'Invoice is not pending' },
      { status: 400 }
    )
  }

  const totalAmount = (
    invoice.amount -
    invoice.discount -
    invoice.creditsUsed
  ).toFixed(2)

  try {
    const checkBraintreeCustomerExists = await checkBraintreeCustomer(userId)

    const result = await gateway.transaction.sale({
      amount: totalAmount,
      orderId: invoiceId,
      paymentMethodNonce: paymentMethodNonce,
      customer: {
        email: userEmail,
        ...(!checkBraintreeCustomerExists ? { id: userId } : {}),
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
        user?.userId
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

      return NextResponse.json({
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
      })
    } else {
      logger.error(`Payment failed for invoice ${invoiceId}`, result)

      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(`Failed to charge amount for invoice ${invoiceId}`, error)

    return NextResponse.json(
      { success: false, message: 'Failed to charge amount' },
      { status: 500 }
    )
  }
}
