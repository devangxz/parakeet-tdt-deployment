/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { checkBraintreeCustomer } from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.userId

    const checkBraintreeCustomerExists = await checkBraintreeCustomer(userId)

    if (!checkBraintreeCustomerExists) {
      logger.info(`found 0 payment methods for user ${userId}`)
      return NextResponse.json([])
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
      data: paymentMethods,
    })
  } catch (error) {
    logger.error(`Failed to get payment methods`, error)
    return NextResponse.json(
      { success: false, message: 'Failed to get payment methods' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { message: 'Payment method token is required' },
        { status: 400 }
      )
    }

    await gateway.paymentMethod.delete(token)

    logger.info(`Payment method removed successfully for user ${user.userId}`)
    return NextResponse.json({ message: 'Successfully removed payment method' })
  } catch (error) {
    logger.error(`Failed to remove payment method`, error)
    return NextResponse.json(
      { message: 'Failed to remove payment method' },
      { status: 500 }
    )
  }
}
