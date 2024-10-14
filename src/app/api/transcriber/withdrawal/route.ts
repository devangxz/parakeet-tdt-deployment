import { InvoiceType, WithdrawalStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import {
  FREE_WITHDRAWAL_AMOUNT,
  CHARGE_ON_LOW_WITHDRAWAL_AMOUNT,
} from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import {
  generateInvoiceId,
  getWithdrawalsBonusesAndMiscEarnings,
  getAssignmentEarnings,
} from '@/utils/backend-helper'

export async function GET(request: Request) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId

  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: transcriberId,
      },
    })
    return NextResponse.json({ withdrawals })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid withdrawal id' },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId
  const invoiceId = generateInvoiceId('CGCR')

  try {
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

      const user = await prisma.user.findUnique({
        where: {
          id: transcriberId,
        },
        select: {
          email: true,
          paypalId: true,
        },
      })

      if (!user) {
        logger.error(`User not found for ${transcriberId}`)
        return true
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
          toPaypalId: user?.paypalId,
        },
      })

      const templateData = {
        amount: currentBalance.toFixed(2),
        paypal_id: user.paypalId ?? '',
      }

      await sendTemplateMail('WITHDRAWAL', transcriberId, templateData)
    })
    logger.info(
      `Withdrawal ${invoiceId} for ${currentBalance} has been created`
    )
    return NextResponse.json({ message: 'Withdrawal has been created' })
  } catch (error) {
    logger.error(`Failed to create withdrawal: ${error}`)
    return NextResponse.json({ error: 'Failed to create withdrawal' })
  }
}
