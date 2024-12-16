/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { JobStatus, JobType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'

export async function getAssignedQCFiles(type?: string | null) {
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

    let assignedQCFiles = await prisma.jobAssignment.findMany({
      where: {
        transcriberId,
        status: JobStatus.ACCEPTED,
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
          in: assignedQCFiles.map((file) => file.order.user.id),
        },
      },
    })

    if (type === 'legal') {
      const legalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() === 'legal'
        )
        .map((userRate) => userRate.userId)

      assignedQCFiles = assignedQCFiles.filter((file) =>
        legalUserIds.includes(file.order.userId)
      )
    } else if (type === 'general') {
      const nonLegalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() !== 'legal'
        )
        .map((userRate) => userRate.userId)

      const usersWithoutRates = assignedQCFiles
        .filter(
          (file) =>
            !userRates.some((userRate) => userRate.userId === file.order.userId)
        )
        .map((file) => file.order.userId)

      assignedQCFiles = assignedQCFiles.filter(
        (file) =>
          nonLegalUserIds.includes(file.order.user.id) ||
          usersWithoutRates.includes(file.order.userId)
      )
    }

    for (const file of assignedQCFiles as any) {
      const transcriberCost = await calculateTranscriberCost(
        file.order,
        transcriberId
      )
      file.order.qc_cost = transcriberCost.cost
      file.order.rate = transcriberCost.rate
    }

    logger.info(
      `Assigned QC files fetched successfully for ${transcriberId} with type ${type}`
    )

    return {
      success: true,
      data: assignedQCFiles,
    }
  } catch (error) {
    logger.error('Error fetching assigned QC files', error)
    return {
      success: false,
      error: 'Failed to fetch assigned QC files',
    }
  }
}
