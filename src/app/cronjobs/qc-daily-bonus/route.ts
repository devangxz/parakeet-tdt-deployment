import { JobStatus, JobType, BonusType, BonusStage } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

interface TranscriberData {
  transcriberId: number
  email: string
  firstname: string | null
  totalHoursWorked: number
  fileIds: string[]
  cfBonusEnabled?: boolean
}

const addBonus = async (
  userId: number,
  amount: number,
  fileIds: string,
  duration: number
) => {
  const result = await prisma.bonus.create({
    data: {
      userId: userId,
      amount: amount,
      fileIds: fileIds,
      type: BonusType.DAILY,
      stage: BonusStage.QC,
      duration: duration,
    },
  })
  return result
}

export async function POST() {
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const now = new Date()
    const dateString = now.toISOString().split('T')[0]
    logger.info(`triggered qc daily bonus cron job on ${dateString}`)

    const startOfDay = new Date(
      Date.UTC(
        yesterday.getUTCFullYear(),
        yesterday.getUTCMonth(),
        yesterday.getUTCDate(),
        0,
        0,
        0,
        0
      )
    )

    const endOfDay = new Date(
      Date.UTC(
        yesterday.getUTCFullYear(),
        yesterday.getUTCMonth(),
        yesterday.getUTCDate(),
        23,
        59,
        59,
        999
      )
    )

    const transcribers = await prisma.jobAssignment.findMany({
      where: {
        status: JobStatus.COMPLETED,
        type: JobType.QC,
        completedTs: {
          gte: startOfDay,
          lt: endOfDay,
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
        const transcriber = acc.find(
          (t) => t.transcriberId === curr.transcriberId
        )
        const duration = curr.order.File ? curr.order.File.duration : 0
        const fileId = curr.order.fileId

        if (transcriber) {
          transcriber.totalHoursWorked += duration
          transcriber.fileIds.push(fileId)
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
      (transcriber) => transcriber.totalHoursWorked / 3600 >= 4
    )

    for (const user of eligibleTranscribers) {
      logger.info(`Sending qc daily bonus for ${user.email}`)

      const totalHours = (user.totalHoursWorked / 3600).toFixed(2)
      const amount = 5
      await addBonus(
        user.transcriberId,
        amount,
        user.fileIds.join(','),
        Number(totalHours)
      )

      const today = new Date()
      const today_date = `${
        today.getMonth() + 1
      }/${today.getDate()}/${today.getFullYear()}`

      const emailData = {
        userEmailId: user.email,
      }

      const templateData = {
        firstname: user.firstname ?? '',
        amount: amount.toString(),
        totalHours: totalHours,
        today_date: today_date,
        file_id: user.fileIds.join(', '),
        type: 'qc bonus',
      }

      const ses = getAWSSesInstance()

      await ses.sendMail('DAILY_BONUS', emailData, templateData)

      logger.info(`Successfully sent qc bonus for ${user.email}`)
    }

    return NextResponse.json({ message: `Successfully sent qc bonus` })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      {
        error: 'An error occurred while sending daily qc bonus',
      },
      { status: 500 }
    )
  }
}
