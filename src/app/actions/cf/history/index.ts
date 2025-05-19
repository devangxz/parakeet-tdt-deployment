/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { OrderStatus, JobType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAccentCode } from '@/services/editor-service/get-accent-code'
import getCustomFormatOption from '@/utils/getCustomFormatOption'
import getOrgName from '@/utils/getOrgName'

export async function getHistoryFiles(
  type: string,
  page: number = 1,
  pageSize: number = 10,
  sortField: string = 'id',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId as number

  try {
    // Calculate pagination parameters
    const skip = (page - 1) * pageSize
    const take = pageSize

    // Base query condition
    const baseWhereCondition = {
      transcriberId,
      type: JobType.FINALIZE,
    }

    // Get total count for pagination
    const totalCount = await prisma.jobAssignment.count({
      where: baseWhereCondition,
    })

    // eslint-disable-next-line prefer-const
    let [historyCFFiles, userRates] = await prisma.$transaction(
      async (prisma) => {
        const historyCFFiles = await prisma.jobAssignment.findMany({
          where: baseWhereCondition,
          include: {
            order: {
              include: {
                File: true,
                user: true,
              },
            },
          },
          skip,
          take,
          orderBy: {
            [sortField]: sortOrder,
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
      const orgName = await getOrgName(file.order.userId)
      const customFormatOption = await getCustomFormatOption(file.order.userId)
      const accent = await getAccentCode(file.order.fileId)
      file.earnings =
        file.order.status === OrderStatus.DELIVERED ? file.earnings : 0
      file.orgName = orgName
      file.customFormatOption = customFormatOption
      file.accentCode = accent.accentCode
    }

    logger.info(
      `History CF files fetched successfully for ${transcriberId}, page ${page}, pageSize ${pageSize}`
    )
    return {
      success: true,
      data: historyCFFiles,
      pagination: {
        totalCount,
        pageCount: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize,
      },
    }
  } catch (error) {
    logger.error(error)
    return { success: false, message: 'Failed to fetch history CF files' }
  }
}
