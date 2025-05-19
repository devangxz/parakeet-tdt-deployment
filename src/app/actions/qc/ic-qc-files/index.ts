/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { JobStatus, OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAccentCode } from '@/services/editor-service/get-accent-code'
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

    let icqcFiles = await prisma.order.findMany({
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
          { priority: 1 },
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

    for (const file of icqcFiles as any) {
      const transcriberCost = await calculateTranscriberCost(file, user.userId)
      const orgName = await getOrgName(file.userId)
      const customFormatOption = await getCustomFormatOption(file.userId)
      const isTestCustomer = await getTestCustomer(file.userId)
      const accent = await getAccentCode(file.fileId)
      file.qc_cost = transcriberCost.cost
      file.rate = transcriberCost.rate
      file.orgName = orgName
      file.isTestCustomer = isTestCustomer
      file.customFormatOption = customFormatOption
      file.accentCode = accent.accentCode
      if (file.priority === 1) {
        file.icqcCategory = 'Priority'
      } else if (file.highDifficulty || file.pwer > 0.2) {
        file.icqcCategory = 'High Difficulty'
      } else if (file.tat === 12) {
        file.icqcCategory = 'Rush (TAT 12)'
      } else if (file.deliveryTs < now) {
        file.icqcCategory = 'Overdue'
      } else {
        file.icqcCategory = 'Regular'
      }
    }

    icqcFiles = icqcFiles.filter((file: any) => {
      if (!file.orgName) return true
      return enabledCustomers.includes(file.orgName.toLowerCase())
    })

    icqcFiles.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      if (b.highDifficulty !== a.highDifficulty) {
        return Number(b.highDifficulty) - Number(a.highDifficulty)
      }
      if (b.tat === 12 && a.tat !== 12) {
        return 1
      }
      if (a.tat === 12 && b.tat !== 12) {
        return -1
      }
      if (b.deliveryTs < now && a.deliveryTs >= now) {
        return 1
      }
      if (a.deliveryTs < now && b.deliveryTs >= now) {
        return -1
      }
      return (b.rateBonus || 0) - (a.rateBonus || 0)
    })

    logger.info(`IC QC files fetched successfully`)
    return {
      success: true,
      data: icqcFiles,
    }
  } catch (error) {
    logger.error('Error fetching IC QC files', error)
    return {
      success: false,
      error: 'Failed to fetch IC QC files',
    }
  }
}
