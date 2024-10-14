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
    // eslint-disable-next-line prefer-const
    let [historyCFFiles, userRates] = await prisma.$transaction(
      async (prisma) => {
        const historyCFFiles = await prisma.jobAssignment.findMany({
          where: {
            transcriberId,
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
              in: historyCFFiles.map((file) => file.order.user.id),
            },
          },
        })

        return [historyCFFiles, userRates]
      }
    )

    if (type === 'legal') {
      const legalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() === 'legal'
        )
        .map((userRate) => userRate.userId)

      historyCFFiles = historyCFFiles.filter((file) =>
        legalUserIds.includes(file.order.userId)
      )
    } else if (type === 'general') {
      const nonLegalUserIds = userRates
        .filter(
          (userRate) => userRate.customFormatOption?.toLowerCase() !== 'legal'
        )
        .map((userRate) => userRate.userId)

      const usersWithoutRates = historyCFFiles
        .filter(
          (file) =>
            !userRates.some((userRate) => userRate.userId === file.order.userId)
        )
        .map((file) => file.order.userId)

      historyCFFiles = historyCFFiles.filter(
        (file) =>
          nonLegalUserIds.includes(file.order.userId) ||
          usersWithoutRates.includes(file.order.userId)
      )
    }

    for (const file of historyCFFiles as any) {
      file.earnings =
        file.order.status === OrderStatus.DELIVERED ? file.earnings : 0
    }

    logger.info(`History CF files fetched successfully for ${transcriberId}`)
    return NextResponse.json(historyCFFiles)
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch history CF files' },
      { status: 500 }
    )
  }
}
