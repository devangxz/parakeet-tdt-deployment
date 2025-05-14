import { JobStatus, JobType, BonusType, BonusStage } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { isTranscriberICQC } from '@/utils/backend-helper'

interface TranscriberData {
  transcriberId: number
  email: string
  firstname: string | null
  totalHoursWorked: number
  fileIds: string[]
  cfBonusEnabled?: boolean
  isICQC?: boolean
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
        isICQC: true,
      },
    })

    const transcriberData = transcribers.reduce<TranscriberData[]>(
      (acc, curr) => {
        const existing = acc.find((t) => t.transcriberId === curr.transcriberId)
        const duration = curr.order.File ? curr.order.File.duration : 0
        const fileId = curr.order.fileId
        const isICQC = curr.isICQC

        if (existing) {
          existing.totalHoursWorked += duration
          existing.fileIds.push(fileId)
          if (isICQC) {
            existing.isICQC = true
          }
        } else {
          acc.push({
            transcriberId: curr.transcriberId,
            email: curr.user.email,
            firstname: curr.user.firstname,
            totalHoursWorked: duration,
            fileIds: [fileId],
            isICQC: isICQC || false,
          })
        }
        return acc
      },
      []
    )

    logger.info(
      `Found ${transcriberData.length} transcribers who completed files last month`
    )

    const eligibleTranscribers = transcriberData.filter(
      (transcriber) => transcriber.totalHoursWorked / 3600 >= 3
    )

    for (const user of eligibleTranscribers) {
      const verifier = await prisma.verifier.findUnique({
        where: { userId: user.transcriberId },
      })

      if (!verifier?.monthlyBonusEnabled) {
        logger.info(
          `Transcriber ${user.email} has monthly bonus disabled in settings`
        )
        continue
      }

      logger.info(`Sending monthly bonus for ${user.email}`)

      const icqcStatus = await isTranscriberICQC(user.transcriberId)
      if (icqcStatus.isICQC) {
        // Check if the IC/QC user has worked at least 24 hours on IC files
        if (!user.isICQC || user.totalHoursWorked / 3600 < 24) {
          logger.info(
            `Skipping IC/QC transcriber ${
              user.email
            } - insufficient IC hours (${(user.totalHoursWorked / 3600).toFixed(
              2
            )}/24)`
          )
          continue
        }
        logger.info(
          `IC/QC transcriber ${user.email} eligible with ${(
            user.totalHoursWorked / 3600
          ).toFixed(2)} hours`
        )
      }

      const hoursWorked = Math.floor(user.totalHoursWorked / 3600)
      const amount = Math.floor(hoursWorked / 3) * 10
      await addBonus(user.transcriberId, amount, jobType)

      logger.info(
        `Successfully sent monthly bonus of $${amount} for ${user.email} (${hoursWorked} hours)`
      )
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
