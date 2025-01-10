import { InvoiceStatus, PaymentMethod } from '@prisma/client'

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

export async function payViaBraintree(
  invoiceId: string,
  orderType: string,
  userId: number,
  userEmail: string,
  paidBy: number
) {
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
