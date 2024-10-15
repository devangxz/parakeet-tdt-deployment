export const dynamic = 'force-dynamic'
import { InvoiceType } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  generateInvoiceId,
  checkBraintreeCustomer,
} from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const selectedId = user?.internalTeamUserId || user?.userId
  const searchParams = req.nextUrl.searchParams
  const amount = searchParams.get('amount') as string
  const invoiceId = generateInvoiceId('CGCR')
  let token = ''

  try {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceId,
        userId: selectedId,
        type: InvoiceType.ADD_CREDITS,
        amount: parseFloat(amount),
      },
    })

    const checkBraintreeCustomerExists = await checkBraintreeCustomer(
      selectedId
    )

    if (!checkBraintreeCustomerExists) {
      const response = await gateway.clientToken.generate({})
      token = response.clientToken
    } else {
      const response = await gateway.clientToken.generate({
        customerId: selectedId.toString(),
      })
      token = response.clientToken
    }

    logger.info(
      `generated add credit ${invoiceId} for amount ${amount} for user ${selectedId}`
    )

    return NextResponse.json({
      success: true,
      s: { token, invoiceId, invoice },
    })
  } catch (error) {
    logger.error(
      `Error generating add credits invoice for ${selectedId}`,
      error
    )

    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
