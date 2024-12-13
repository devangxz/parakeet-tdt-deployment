'use server'

import { PaymentMethod } from '@prisma/client'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'
export async function getClientToken() {
  try {
    const response = await gateway.clientToken.generate({})
    const clientToken = response.clientToken

    return { success: true, clientToken }
  } catch (error) {
    console.error('Error generating client token:', error)
    return { success: false, error: 'Failed to generate client token' }
  }
}

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

interface PayBillParams {
  paymentMethodNonce: string
  email: string
  amount: string
  fullName: string
}

export async function payBill({
  paymentMethodNonce,
  email,
  amount,
  fullName,
}: PayBillParams) {
  if (!paymentMethodNonce || !email || !amount || !fullName) {
    return {
      success: false,
      message: 'Missing required fields',
    }
  }

  try {
    const result = await gateway.transaction.sale({
      amount: amount,
      paymentMethodNonce: paymentMethodNonce,
      customer: {
        email: email,
      },
      options: {
        submitForSettlement: true,
      },
    })

    if (result.success) {
      logger.info(`Payment successful for user ${email}`)
      const emailData = {
        userEmailId: email,
      }

      const templateData = {
        fullName: fullName,
        amount: amount,
      }

      const ses = getAWSSesInstance()

      await ses.sendMail('PUBLIC_PAY_BILL', emailData, templateData)

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
      }
    } else {
      logger.error(`Payment failed for user ${email}`, result)

      return {
        success: false,
        message: result.message,
      }
    }
  } catch (error) {
    logger.error(`Failed to charge amount for user ${email}`, error)

    return {
      success: false,
      message: 'Failed to charge amount',
    }
  }
}
