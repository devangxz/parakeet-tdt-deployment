import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { orderFiles } from '@/services/order-service'
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

const payViaBraintree = async (
  invoiceId: string,
  orderType: string,
  userId: number,
  userEmail: string,
  paidBy: number
) => {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
  })

  if (!invoice) {
    return {
      success: false,
      message: 'Invoice not found',
    }
  }

  const totalAmount = (
    invoice.amount -
    invoice.discount -
    invoice.creditsUsed
  ).toFixed(2)

  try {
    const checkBraintreeCustomerExists = await checkBraintreeCustomer(
      userId as number
    )

    let paymentMethod
    if (checkBraintreeCustomerExists) {
      const customer = await gateway.customer.find(userId.toString())
      const paymentMethods = customer.paymentMethods

      if (!paymentMethods || paymentMethods.length === 0) {
        return {
          success: false,
          message: 'No payment method found',
        }
      }

      paymentMethod = paymentMethods[0].token
    }

    const result = await gateway.transaction.sale({
      amount: totalAmount,
      orderId: invoiceId,
      ...(paymentMethod ? { paymentMethodToken: paymentMethod } : {}),
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
        paidBy
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
          paidBy: paidBy,
        },
      })
      logger.info(`Payment successful for invoice ${invoiceId}`)

      return {
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
    } else {
      logger.error(`Payment failed for invoice ${invoiceId}`, result)
      return { success: false, message: result.message }
    }
  } catch (error) {
    logger.error(`Failed to charge amount for invoice ${invoiceId}`, error)
    return { success: false, message: 'Failed to charge amount' }
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { fileIds, orderType } = await req.json()

    console.log('ffdvfdv', fileIds, orderType)

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
