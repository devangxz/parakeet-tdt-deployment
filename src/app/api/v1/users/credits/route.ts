export const dynamic = 'force-dynamic'
import { InvoiceType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getCreditBalance } from '@/services/payment-service/get-credit-balance'
import { generateInvoiceId } from '@/utils/backend-helper'
import { payViaBraintree } from '@/utils/payViaBraintree'

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
