/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { OrderStatus, JobType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId
  try {
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
    return NextResponse.json(historyQCFiles)
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch history QC files' },
      { status: 500 }
    )
  }
}
