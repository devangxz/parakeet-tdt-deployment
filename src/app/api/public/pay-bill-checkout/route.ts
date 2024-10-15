import { PaymentMethod } from '@prisma/client'
import { NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

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

export async function POST(request: Request) {
  const { paymentMethodNonce, email, amount, fullName } = await request.json()

  if (!paymentMethodNonce || !email || !amount || !fullName) {
    return NextResponse.json(
      { success: false, message: 'Missing required fields' },
      { status: 400 }
    )
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
      })
    } else {
      logger.error(`Payment failed for user ${email}`, result)

      return NextResponse.json({
        success: false,
        message: result.message,
      })
    }
  } catch (error) {
    logger.error(`Failed to charge amount for user ${email}`, error)

    return NextResponse.json({
      success: false,
      message: 'Failed to charge amount',
    })
  }
}
