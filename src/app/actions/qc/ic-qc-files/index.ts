/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { JobStatus, OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { isTranscriberICQC, getTestCustomer } from '@/utils/backend-helper'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'
import getCustomFormatOption from '@/utils/getCustomFormatOption'
import getOrgName from '@/utils/getOrgName'

export async function getICQCFiles() {
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

    const isICQCResult = await isTranscriberICQC(user.userId)
    if (!isICQCResult.isICQC) {
      return {
        success: false,
        error: 'User is not authorized to access IC QC files',
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

    const cancelledJobs = await prisma.jobAssignment.findMany({
      where: {
        transcriberId: user.userId,
        status: {
          in: [JobStatus.CANCELLED, JobStatus.REJECTED],
        },
        type: 'QC',
      },
      select: {
        orderId: true,
      },
    })

    const cancelledOrderIds = cancelledJobs.map((job) => job.orderId)

    const now = new Date()

    let primaryFiles = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.TRANSCRIBED, OrderStatus.FORMATTED],
        },
        updatedAt: {
          lte: new Date(Date.now() - 60 * 1000),
        },
        id: {
          notIn: cancelledOrderIds,
        },
        OR: [
          { priority: { gte: 1 } },
          { highDifficulty: true },
          { tat: 12 },
          { deliveryTs: { lt: now } },
          { pwer: { gte: 0.2 } },
        ],
      },
      include: {
        File: true,
        user: true,
      },
    })

    for (const file of primaryFiles as any) {
      const transcriberCost = await calculateTranscriberCost(file, user.userId)
      const orgName = await getOrgName(file.userId)
      const customFormatOption = await getCustomFormatOption(file.userId)
      const isTestCustomer = await getTestCustomer(file.userId)
      file.qc_cost = transcriberCost.cost
      file.rate = transcriberCost.rate
      file.orgName = orgName
      file.isTestCustomer = isTestCustomer
      file.customFormatOption = customFormatOption

      if (file.tat === 12) {
        file.icqcCategory = 'Rush Order'
      } else if (file.priority >= 1) {
        file.icqcCategory = 'Priority'
      } else if (file.deliveryTs < now) {
        file.icqcCategory = 'Overdue'
      } else if (file.highDifficulty || file.pwer > 0.2) {
        file.icqcCategory = 'High Difficulty'
      } else {
        file.icqcCategory = 'Regular'
      }
    }

    primaryFiles = primaryFiles.filter((file: any) => {
      if (!file.orgName) return true
      return enabledCustomers.includes(file.orgName.toLowerCase())
    })

    primaryFiles.sort((a, b) => {
      // 1. Rush orders (TAT 12)
      if (a.tat === 12 && b.tat !== 12) return -1
      if (b.tat === 12 && a.tat !== 12) return 1

      // 2. Prioritized files by OMs
      if (a.priority >= 1 && b.priority < 1) return -1
      if (b.priority >= 1 && a.priority < 1) return 1

      // 3. Overdue files
      const aIsOverdue = a.deliveryTs < now
      const bIsOverdue = b.deliveryTs < now
      if (aIsOverdue && !bIsOverdue) return -1
      if (bIsOverdue && !aIsOverdue) return 1

      // 4. HD files
      const aIsHD = a.highDifficulty || (a.pwer ?? 0) >= 0.2
      const bIsHD = b.highDifficulty || (b.pwer ?? 0) >= 0.2
      if (aIsHD && !bIsHD) return -1
      if (bIsHD && !aIsHD) return 1

      // Within same category, sort by rate bonus
      return (b.rateBonus || 0) - (a.rateBonus || 0)
    })

    if (primaryFiles.length > 0) {
      logger.info(
        `IC QC primary files fetched successfully: ${primaryFiles.length} files`
      )
      return {
        success: true,
        data: primaryFiles,
      }
    }

    const regularFiles = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.TRANSCRIBED, OrderStatus.FORMATTED],
        },
        updatedAt: {
          lte: new Date(Date.now() - 60 * 1000),
        },
        id: {
          notIn: cancelledOrderIds,
        },
        highDifficulty: false,
        pwer: {
          lt: 0.2,
        },
        priority: 0,
        tat: {
          not: 12,
        },
        deliveryTs: {
          gte: now,
        },
      },
      include: {
        File: true,
        user: true,
      },
      orderBy: {
        deliveryTs: 'desc',
      },
    })

    for (const file of regularFiles as any) {
      const transcriberCost = await calculateTranscriberCost(file, user.userId)
      const orgName = await getOrgName(file.userId)
      const customFormatOption = await getCustomFormatOption(file.userId)
      const isTestCustomer = await getTestCustomer(file.userId)
      file.qc_cost = transcriberCost.cost
      file.rate = transcriberCost.rate
      file.orgName = orgName
      file.isTestCustomer = isTestCustomer
      file.customFormatOption = customFormatOption
      file.icqcCategory = 'Regular Queue'
    }

    const filteredRegularFiles = regularFiles.filter((file: any) => {
      if (!file.orgName) return true
      return enabledCustomers.includes(file.orgName.toLowerCase())
    })

    return {
      success: true,
      data: filteredRegularFiles,
    }
  } catch (error) {
    logger.error('Error fetching IC QC files', error)
    return {
      success: false,
      error: 'Failed to fetch IC QC files',
    }
  }
}
