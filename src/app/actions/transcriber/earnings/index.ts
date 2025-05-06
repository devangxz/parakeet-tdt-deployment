'use server'

import { JobStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  getWithdrawalsBonusesAndMiscEarnings,
  getTranscriberCreditedHours,
  getTranscriberTodayCreditedHours,
} from '@/utils/backend-helper'

export async function getTranscriberEarnings() {
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

    const earnings: { [key: string]: number } = {
      TR_LEGACY: 0,
      RV_LEGACY: 0,
      PR_LEGACY: 0,
      QC: 0,
      REVIEW: 0,
      WITHDRAWAL: 0,
      CURRENT_BALANCE: 0,
      TOTAL: 0,
      CB: 0,
      DB: 0,
      CREDITED_HOURS: 0,
      TODAY_CREDITED_HOURS: 0,
      ME: 0,
    }

    const completedJobs = await prisma.jobAssignment.findMany({
      where: {
        transcriberId,
        status: JobStatus.COMPLETED,
        order: {
          status: 'DELIVERED',
        },
      },
    })

    const withdrawalsAndBonuses = await getWithdrawalsBonusesAndMiscEarnings(
      transcriberId
    )

    earnings['WITHDRAWAL'] = withdrawalsAndBonuses.withdrawals

    const bonus_earnings = withdrawalsAndBonuses.bonuses
    const misc_earnings = withdrawalsAndBonuses.miscEarnings

    let totalEarnings = 0
    for (const job of completedJobs) {
      if (!earnings[job.type]) {
        earnings[job.type] = 0
      }
      earnings[job.type] += job.earnings
      totalEarnings += job.earnings
    }
    earnings['TOTAL'] = totalEarnings + bonus_earnings + misc_earnings
    earnings['DB'] = bonus_earnings
    earnings['ME'] = misc_earnings
    earnings['CREDITED_HOURS'] = await getTranscriberCreditedHours(
      transcriberId
    )
    earnings['TODAY_CREDITED_HOURS'] = await getTranscriberTodayCreditedHours(
      transcriberId
    )

    earnings['CURRENT_BALANCE'] = earnings['TOTAL'] - earnings['WITHDRAWAL']

    const transcriberDetails = await prisma.user.findUnique({
      where: {
        id: transcriberId,
      },
      select: {
        paypalId: true,
      },
    })
    logger.info(`Earnings fetched successfully for ${transcriberId}`)
    return {
      success: true,
      earnings,
      paypalId: transcriberDetails ? transcriberDetails.paypalId : user?.email,
    }
  } catch (error) {
    logger.error(`Failed to fetch earnings: ${error}`)
    return {
      success: false,
      message: 'Failed to fetch earnings',
    }
  }
}
