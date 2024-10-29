/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import { checkBraintreeCustomer } from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId

  try {
    const checkBraintreeCustomerExists = await checkBraintreeCustomer(userId)

    if (!checkBraintreeCustomerExists) {
      logger.info(`found 0 payment methods for user ${userId}`)
      return NextResponse.json({
        success: true,
        pms: [],
      })
    }

    const result = await gateway.customer.find(userId.toString())
    const paymentMethods =
      result?.paymentMethods?.map((paymentMethod: any) => {
        const isPayPal = paymentMethod.constructor.name === 'PayPalAccount'
        return {
          type: isPayPal ? 'PP' : 'CC',
          token: paymentMethod.token,
          last4: isPayPal ? null : paymentMethod.last4,
          ppAccount: isPayPal ? paymentMethod.email : null,
          userId: paymentMethod.customerId,
          image: paymentMethod.imageUrl,
          desc: isPayPal
            ? `PayPal Account ( ${paymentMethod.email} )`
            : `${paymentMethod.cardType} Credit Card ( ${paymentMethod.last4} )`,
        }
      }) ?? []

    logger.info(
      `found ${paymentMethods.length} payment methods for user ${userId}`
    )
    return NextResponse.json({
      success: true,
      pms: paymentMethods,
    })
  } catch (error) {
    logger.error(`Failed to get payment methods for ${userId}`, error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
