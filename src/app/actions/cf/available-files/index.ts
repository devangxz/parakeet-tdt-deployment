/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { OrderStatus, OrderType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { isTranscriberICQC, getTestCustomer } from '@/utils/backend-helper'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'
import getOrgName from '@/utils/getOrgName'

export async function getAvailableFiles(type: string) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.userId as number
  try {
    let cfFiles = await prisma.order.findMany({
      where: {
        status: OrderStatus.REVIEW_COMPLETED,
        orderType: OrderType.TRANSCRIPTION_FORMATTING,
      },
      include: {
        File: true,
        user: true,
      },
    })

    const userRates = await prisma.userRate.findMany({
      where: {
        userId: {
          in: cfFiles.map((file) => file.userId),
        },
      },
    })

    const verifier = await prisma.verifier.findUnique({
      where: {
        userId: userId,
      },
    })

    const enabledCustomers =
      verifier?.enabledCustomers
        ?.split(',')
        .map((customer) => customer.toLowerCase()) || []

    if (type === 'legal') {
      const legalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() === 'legal'
        )
        .map((userRate) => userRate.userId)

      cfFiles = cfFiles.filter((file) => legalUserIds.includes(file.userId))
    } else if (type === 'general') {
      const nonLegalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() !== 'legal'
        )
        .map((userRate) => userRate.userId)

      const usersWithoutRates = cfFiles
        .filter(
          (file) =>
            !userRates.some((userRate) => userRate.userId === file.userId)
        )
        .map((file) => file.userId)

      cfFiles = cfFiles.filter(
        (file) =>
          nonLegalUserIds.includes(file.userId) ||
          usersWithoutRates.includes(file.userId)
      )
    }

    cfFiles.sort((a, b) => b.priority - a.priority)

    for (const file of cfFiles as any) {
      const transcriberCost = await calculateTranscriberCost(file, userId)
      const orgName = await getOrgName(file.userId)
      const isTestCustomer = await getTestCustomer(file.userId)
      file.cf_cost = transcriberCost.cost
      file.cf_rate = transcriberCost.rate
      file.orgName = orgName
      file.isTestCustomer = isTestCustomer
    }

    cfFiles = cfFiles.filter((file: any) => {
      if (!file.orgName) return true
      if (file.orgName.toLowerCase() === 'acr') {
        return verifier?.acrReviewEnabled && enabledCustomers.includes('acr')
      }
      return enabledCustomers.includes(file.orgName.toLowerCase())
    })

    const isTranscriberICQCResult = await isTranscriberICQC(userId)

    if (isTranscriberICQCResult.isICQC) {
      cfFiles.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }
        if (b.highDifficulty !== a.highDifficulty) {
          return Number(b.highDifficulty) - Number(a.highDifficulty)
        }
        return (b.rateBonus || 0) - (a.rateBonus || 0)
      })
    }

    logger.info(`Available CF files fetched successfully`)
    return { success: true, cfFiles }
  } catch (error) {
    logger.error(error)
    return { success: false, message: 'Failed to fetch available CF files' }
  }
}
