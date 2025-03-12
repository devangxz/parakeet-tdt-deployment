/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { isTranscriberICQC, getTestCustomer } from '@/utils/backend-helper'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'
import getCustomFormatOption from '@/utils/getCustomFormatOption'
import getOrgName from '@/utils/getOrgName'

export async function getAvailableQCFiles(type?: string | null) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user?.userId) {
      logger.error('User not authenticated')
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    const verifier = await prisma.verifier.findUnique({
      where: {
        userId: user.userId,
      },
    })

    if (verifier?.qcDisabled) {
      return {
        success: true,
        data: [],
        isQCDisabled: true,
      }
    }

    const enabledCustomers =
      verifier?.enabledCustomers
        ?.split(',')
        .map((customer) => customer.toLowerCase()) || []

    let qcFiles = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.TRANSCRIBED, OrderStatus.FORMATTED],
        },
        updatedAt: {
          lte: new Date(Date.now() - 60 * 1000),
        },
      },
      include: {
        File: true,
        user: true,
      },
    })

    const userRates = await prisma.userRate.findMany({
      where: {
        userId: {
          in: qcFiles.map((file) => file.userId),
        },
      },
    })

    if (type === 'legal') {
      const legalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() === 'legal'
        )
        .map((userRate) => userRate.userId)

      qcFiles = qcFiles.filter((file) => legalUserIds.includes(file.userId))
    } else if (type === 'general') {
      const nonLegalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() !== 'legal'
        )
        .map((userRate) => userRate.userId)

      const usersWithoutRates = qcFiles
        .filter(
          (file) =>
            !userRates.some((userRate) => userRate.userId === file.userId)
        )
        .map((file) => file.userId)

      qcFiles = qcFiles.filter(
        (file) =>
          nonLegalUserIds.includes(file.userId) ||
          usersWithoutRates.includes(file.userId)
      )
    }

    qcFiles.sort((a, b) => b.priority - a.priority)

    for (const file of qcFiles as any) {
      const transcriberCost = await calculateTranscriberCost(file, user.userId)
      const orgName = await getOrgName(file.userId)
      const customFormatOption = await getCustomFormatOption(file.userId)
      const isTestCustomer = await getTestCustomer(file.userId)
      file.qc_cost = transcriberCost.cost
      file.rate = transcriberCost.rate
      file.orgName = orgName
      file.isTestCustomer = isTestCustomer
      file.customFormatOption = customFormatOption
    }

    qcFiles = qcFiles.filter((file: any) => {
      if (!file.orgName) return true
      return enabledCustomers.includes(file.orgName.toLowerCase())
    })

    const isTranscriberICQCResult = await isTranscriberICQC(user.userId)

    if (isTranscriberICQCResult.isICQC) {
      qcFiles.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority
        }
        if (b.highDifficulty !== a.highDifficulty) {
          return Number(b.highDifficulty) - Number(a.highDifficulty)
        }
        return (b.rateBonus || 0) - (a.rateBonus || 0)
      })
    }

    logger.info(`Available QC files fetched successfully`)
    return {
      success: true,
      data: qcFiles,
    }
  } catch (error) {
    logger.error('Error fetching available QC files', error)
    return {
      success: false,
      error: 'Failed to fetch available QC files',
    }
  }
}
