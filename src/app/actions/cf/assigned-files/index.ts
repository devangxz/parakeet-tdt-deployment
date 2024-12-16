/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { JobStatus, JobType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'

export async function getAssignedFiles(type: string) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId as number

  try {
    let assignedCFFiles = await prisma.jobAssignment.findMany({
      where: {
        transcriberId,
        status: JobStatus.ACCEPTED,
        type: JobType.FINALIZE,
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
          in: assignedCFFiles.map((file) => file.order.user.id),
        },
      },
    })

    if (type === 'legal') {
      const legalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() === 'legal'
        )
        .map((userRate) => userRate.userId)

      assignedCFFiles = assignedCFFiles.filter((file) =>
        legalUserIds.includes(file.order.userId)
      )
    } else if (type === 'general') {
      const nonLegalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() !== 'legal'
        )
        .map((userRate) => userRate.userId)

      const usersWithoutRates = assignedCFFiles
        .filter(
          (file) =>
            !userRates.some((userRate) => userRate.userId === file.order.userId)
        )
        .map((file) => file.order.userId)

      assignedCFFiles = assignedCFFiles.filter(
        (file) =>
          nonLegalUserIds.includes(file.order.userId) ||
          usersWithoutRates.includes(file.order.userId)
      )
    }

    for (const file of assignedCFFiles as any) {
      const transcriberCost = await calculateTranscriberCost(
        file.order,
        transcriberId
      )
      file.order.cf_cost = transcriberCost.cost
      file.order.cf_rate = transcriberCost.rate
    }

    logger.info(`Assigned CF files fetched successfully for ${transcriberId}`)
    return { success: true, data: assignedCFFiles }
  } catch (error) {
    logger.error('Error fetching assigned CF files', error)
    return { success: false, message: 'Failed to fetch assigned CF files' }
  }
}
