import { JobStatus, JobType, BonusType, BonusStage } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface TranscriberData {
  transcriberId: number
  email: string
  firstname: string | null
  totalHoursWorked: number
  fileIds: string[]
  cfBonusEnabled?: boolean
}

const addBonus = async (userId: number, amount: number, jobType: JobType) => {
  const result = await prisma.bonus.create({
    data: {
      userId,
      amount,
      type: BonusType.MONTHLY,
      stage: jobType === JobType.QC ? BonusStage.QC : BonusStage.FINALIZE,
    },
  })
  return result
}

const giveBonus = async (jobType: JobType) => {
  try {
    const now = new Date()
    const startOfLastMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0)
    )
    const startOfCurrentMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)
    )

    logger.info(
      `Triggered monthly bonus cron job for period ${startOfLastMonth.toISOString()} to ${startOfCurrentMonth.toISOString()}`
    )

    const transcribers = await prisma.jobAssignment.findMany({
      where: {
        status: JobStatus.COMPLETED,
        type: jobType,
        completedTs: {
          gte: startOfLastMonth,
          lt: startOfCurrentMonth,
        },
      },
      select: {
        transcriberId: true,
        user: {
          select: {
            email: true,
            firstname: true,
          },
        },
        order: {
          select: {
            fileId: true,
            File: {
              select: {
                duration: true,
              },
            },
          },
        },
      },
    })

    const transcriberData = transcribers.reduce<TranscriberData[]>(
      (acc, curr) => {
        const existing = acc.find((t) => t.transcriberId === curr.transcriberId)
        const duration = curr.order.File ? curr.order.File.duration : 0
        const fileId = curr.order.fileId

        if (existing) {
          existing.totalHoursWorked += duration
          existing.fileIds.push(fileId)
        } else {
          acc.push({
            transcriberId: curr.transcriberId,
            email: curr.user.email,
            firstname: curr.user.firstname,
            totalHoursWorked: duration,
            fileIds: [fileId],
          })
        }
        return acc
      },
      []
    )

    const eligibleTranscribers = transcriberData.filter(
      (transcriber) => transcriber.totalHoursWorked / 3600 >= 3
    )

    for (const user of eligibleTranscribers) {
      const verifier = await prisma.verifier.findUnique({
        where: { userId: user.transcriberId },
      })

      if (!verifier?.monthlyBonusEnabled) continue

      logger.info(`Sending monthly bonus for ${user.email}`)

      const hoursWorked = Math.floor(user.totalHoursWorked / 3600)
      const amount = Math.floor(hoursWorked / 3) * 10
      await addBonus(user.transcriberId, amount, jobType)

      logger.info(`Successfully sent monthly bonus for ${user.email}`)
    }
  } catch (error) {
    logger.error(`Error sending monthly bonus: ${error}`)
    throw error
  }
}

export async function POST() {
  try {
    await giveBonus(JobType.QC)
    await giveBonus(JobType.FINALIZE)
    return NextResponse.json({ message: 'Successfully sent monthly bonus' })
  } catch (error) {
    logger.error(`Error sending monthly bonus: ${error}`)
    return NextResponse.json(
      { error: 'An error occurred while sending monthly bonus' },
      { status: 500 }
    )
  }
}
