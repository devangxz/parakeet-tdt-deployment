/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { JobStatus, JobType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId

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
        user?.userId
      )
      file.order.cf_cost = transcriberCost.cost
      file.order.cf_rate = transcriberCost.rate
    }

    logger.info(`Assigned CF files fetched successfully for ${transcriberId}`)
    return NextResponse.json(assignedCFFiles)
  } catch (error) {
    logger.error('Error fetching assigned CF files', error)
    return NextResponse.json({ error: 'Failed to fetch assigned CF files' })
  }
}
