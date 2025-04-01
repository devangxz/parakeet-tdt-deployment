/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processPayment } from '@/services/payment-service/process-payment'
import { checkBraintreeCustomer, isNewCustomer } from '@/utils/backend-helper'

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

interface CheckoutPayload {
  paymentMethodNonce: string
  invoiceId: string
  orderType: string
  dueDate?: string
}

export async function checkout(payload: CheckoutPayload) {
  const { paymentMethodNonce, invoiceId, orderType, dueDate } = payload
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId
  const userEmail = user?.email

  if (!paymentMethodNonce || !invoiceId) {
    return {
      success: false,
      message: 'Payment method nonce and invoice ID are required.',
    }
  }

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceId },
  })

  if (!invoice) {
    logger.error(`Invoice not found ${invoiceId}`)
    return { success: false, message: 'Invoice not found' }
  }

  if (invoice.status !== InvoiceStatus.PENDING) {
    logger.error(`Invoice is not pending ${invoiceId}`)
    return { success: false, message: 'Invoice is not pending' }
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
        user?.userId as number,
        dueDate
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

      const newCustomer = await isNewCustomer(userId as number)

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
        isNewCustomer: newCustomer,
      }
    } else {
      logger.error(
        `Payment failed for invoice ${invoice.itemNumber} ${invoiceId}`,
        result
      )
      return { success: false, message: result.message }
    }
  } catch (error) {
    logger.error(`Failed to charge amount for invoice ${invoiceId}`, error)
    return { success: false, message: 'Failed to charge amount' }
  }
}
