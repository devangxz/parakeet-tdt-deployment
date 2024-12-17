/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { OrderStatus, JobType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getHistoryQCFiles(type?: string | null) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId

    if (!transcriberId) {
      logger.error('User not authenticated')
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    let historyQCFiles = await prisma.jobAssignment.findMany({
      where: {
        transcriberId,
        type: {
          in: [JobType.QC, JobType.REVIEW],
        },
      },
      include: {
        order: {
          include: {
            File: true,
            user: true,
          },
        },
      },
    })

    const userRates = await prisma.userRate.findMany({
      where: {
        userId: {
          in: historyQCFiles.map((file) => file.order.userId),
        },
      },
    })

    if (type === 'legal') {
      const legalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() === 'legal'
        )
        .map((userRate) => userRate.userId)

      historyQCFiles = historyQCFiles.filter((file) =>
        legalUserIds.includes(file.order.userId)
      )
    } else if (type === 'general') {
      const nonLegalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() !== 'legal'
        )
        .map((userRate) => userRate.userId)
      const usersWithoutRates = historyQCFiles
        .filter(
          (file) =>
            !userRates.some((userRate) => userRate.userId === file.order.userId)
        )
        .map((file) => file.order.userId)
      historyQCFiles = historyQCFiles.filter(
        (file) =>
          nonLegalUserIds.includes(file.order.userId) ||
          usersWithoutRates.includes(file.order.userId)
      )
    }

    for (const file of historyQCFiles as any) {
      file.earnings =
        file.order.status === OrderStatus.DELIVERED ? file.earnings : 0
    }

    logger.info(
      `History QC files fetched successfully for ${transcriberId} with type ${type}`
    )
    return {
      success: true,
      data: historyQCFiles,
    }
  } catch (error) {
    logger.error('Error fetching history QC files', error)
    return {
      success: false,
      error: 'Failed to fetch history QC files',
    }
  }
}
