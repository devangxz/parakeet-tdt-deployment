export const dynamic = 'force-dynamic'
import { InvoiceType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import {
  generateInvoiceId,
  checkBraintreeCustomer,
} from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const amount = searchParams.get('amount')
    const selectedId = user?.internalTeamUserId || user?.userId

    if (!amount) {
      return NextResponse.json(
        { message: 'amount is required' },
        { status: 400 }
      )
    }

    const invoiceId = generateInvoiceId('CGCR')
    let token = ''

    await prisma.invoice.create({
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
      data: { token, invoiceId },
    })
  } catch (error) {
    logger.error(`Error generating add credits invoice`, error)
    return NextResponse.json(
      { message: 'Failed to generate add credit invoice' },
      { status: 500 }
    )
  }
}
