import { InvoiceType, WithdrawalStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import {
  FREE_WITHDRAWAL_AMOUNT,
  CHARGE_ON_LOW_WITHDRAWAL_AMOUNT,
} from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import {
  generateInvoiceId,
  getWithdrawalsBonusesAndMiscEarnings,
  getAssignmentEarnings,
} from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: user.userId,
      },
    })

    return NextResponse.json(withdrawals)
  } catch (error) {
    logger.error(`Failed to fetch withdrawals: ${error}`)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch withdrawals' },
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

    const transcriberId = user.userId
    const invoiceId = generateInvoiceId('CGCR')
    let currentBalance = 0

    await prisma.$transaction(async (prisma) => {
      const withdrawalsAndBonuses = await getWithdrawalsBonusesAndMiscEarnings(
        transcriberId
      )

      const earnings = await getAssignmentEarnings(transcriberId)

      currentBalance =
        earnings +
        withdrawalsAndBonuses.bonuses +
        withdrawalsAndBonuses.miscEarnings -
        withdrawalsAndBonuses.withdrawals

      const userDetails = await prisma.user.findUnique({
        where: {
          id: transcriberId,
        },
        select: {
          email: true,
          paypalId: true,
        },
      })

      if (!userDetails) {
        logger.error(`User not found for ${transcriberId}`)
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        )
      }

      await prisma.invoice.create({
        data: {
          invoiceId,
          userId: transcriberId,
          type: InvoiceType.WITHDRAWAL,
        },
      })

      await prisma.withdrawal.create({
        data: {
          userId: transcriberId,
          amount: Number(currentBalance.toFixed(2)),
          fee:
            currentBalance < FREE_WITHDRAWAL_AMOUNT
              ? Number(
                  (currentBalance * CHARGE_ON_LOW_WITHDRAWAL_AMOUNT).toFixed(2)
                )
              : null,
          invoiceId: invoiceId,
          status: WithdrawalStatus.PENDING,
          requestedAt: new Date(),
          toPaypalId: userDetails?.paypalId,
        },
      })

      const templateData = {
        amount: currentBalance.toFixed(2),
        paypal_id: userDetails.paypalId ?? '',
      }

      await sendTemplateMail('WITHDRAWAL', transcriberId, templateData)
    })

    logger.info(
      `Withdrawal ${invoiceId} for ${currentBalance} has been created`
    )

    return NextResponse.json('Withdrawal has been created')
  } catch (error) {
    logger.error(`Failed to create withdrawal: ${error}`)
    return NextResponse.json(
      { success: false, message: 'Failed to create withdrawal' },
      { status: 500 }
    )
  }
}
