/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { isTranscriberICQC } from '@/utils/backend-helper'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  try {
    let qcFiles = await prisma.order.findMany({
      where: {
        status: {
          in: [OrderStatus.TRANSCRIBED, OrderStatus.FORMATTED],
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
      const transcriberCost = await calculateTranscriberCost(file, user?.userId)
      file.qc_cost = transcriberCost.cost
      file.rate = transcriberCost.rate
    }

    const isTranscriberICQCResult = await isTranscriberICQC(user?.userId)

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
    return NextResponse.json(qcFiles)
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch available QC files' },
      { status: 500 }
    )
  }
}
