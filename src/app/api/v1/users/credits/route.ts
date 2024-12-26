export const dynamic = 'force-dynamic'
import { InvoiceStatus, InvoiceType, PaymentMethod } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getCreditBalance } from '@/services/payment-service/get-credit-balance'
import { processPayment } from '@/services/payment-service/process-payment'
import {
  generateInvoiceId,
  checkBraintreeCustomer,
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

  const totalAmount = invoice.amount.toFixed(2)

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
      await prisma.invoice.update({
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
        cc_last4: result.transaction?.creditCard?.last4,
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

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const creditBalanceResult = await getCreditBalance(
      user?.userId as number,
      user?.internalTeamUserId as number | null
    )
    if (creditBalanceResult.success) {
      logger.info(`Credit balance fetched successfully for user ${user.email}`)
      return NextResponse.json(creditBalanceResult)
    } else {
      logger.error(`Failed to fetch credit balance for user ${user.email}`)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch credit balance',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Error fetching user credits:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const selectedId = user?.internalTeamUserId || user?.userId

    const body = await req.json()
    const { amount } = body

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { message: 'Invalid amount provided' },
        { status: 400 }
      )
    }

    const invoiceId = generateInvoiceId('CGCR')

    await prisma.invoice.create({
      data: {
        invoiceId,
        userId: selectedId,
        type: InvoiceType.ADD_CREDITS,
        amount: amount,
      },
    })

    const addCreditsResult = await payViaBraintree(
      invoiceId,
      'TRANSCRIPTION',
      selectedId,
      user.email,
      user.userId
    )

    if (addCreditsResult.success) {
      logger.info(`Credits added successfully for user ${user.email}`)
      return NextResponse.json(addCreditsResult)
    } else {
      logger.error(`Failed to add credits for user ${user.email}`)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to add credits',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Error adding credits:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
