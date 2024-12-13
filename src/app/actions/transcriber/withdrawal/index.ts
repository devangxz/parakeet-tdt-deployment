'use server'

import { InvoiceType, WithdrawalStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
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

export async function getWithdrawals() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId

    if (!transcriberId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        userId: transcriberId,
      },
    })

    return {
      success: true,
      withdrawals,
    }
  } catch (error) {
    logger.error(`Failed to fetch withdrawals: ${error}`)
    return {
      success: false,
      message: 'Failed to fetch withdrawals',
    }
  }
}

export async function createWithdrawal() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId

    if (!transcriberId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

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

    return {
      success: true,
      message: 'Withdrawal has been created',
    }
  } catch (error) {
    logger.error(`Failed to create withdrawal: ${error}`)
    return {
      success: false,
      message: 'Failed to create withdrawal',
    }
  }
}
