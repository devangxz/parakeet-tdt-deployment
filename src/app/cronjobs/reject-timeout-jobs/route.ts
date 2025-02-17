import { JobStatus, JobType, OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import config from '../../../../config.json'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import getOrgName from '@/utils/getOrgName'

export async function POST() {
  try {
    const rejectedFiles: string[] = []
    const assignedFiles = await prisma.jobAssignment.findMany({
      where: {
        status: JobStatus.ACCEPTED,
        type: JobType.QC,
      },
      include: {
        order: {
          include: {
            File: true,
          },
        },
        user: true,
      },
    })

    const extensionTimeMultiplier = config.extension_time_multiplier

    for (const file of assignedFiles) {
      if (file.order.File?.duration) {
        const orgName = await getOrgName(file.order.userId)
        if (orgName && ['acr', 'remotelegal'].includes(orgName.toLowerCase())) {
          continue
        }

        if (file.assignMode === 'MANUAL') {
          continue
        }

        let timeoutMultiplier = 4
        if (file.order.File.duration <= 1800) {
          // Less than 30 mins
          timeoutMultiplier = 6
        } else if (file.order.File.duration <= 10800) {
          // Between 30 mins and 3 hours
          timeoutMultiplier = 5
        }

        let durationInMs = file.order.File.duration * timeoutMultiplier * 1000
        if (file.order.File.duration <= 10800) {
          durationInMs += 7200 * 1000 // Add 2 hours for files under 3 hours
        }

        if (file.extensionRequested) {
          durationInMs +=
            file.order.File.duration * extensionTimeMultiplier * 1000
        }

        const requiredTime = new Date(Date.now() - durationInMs)

        if (new Date(file.acceptedTs) < requiredTime) {
          await prisma.$transaction(async (prisma) => {
            await prisma.jobAssignment.update({
              where: {
                id: file.id,
              },
              data: {
                status: JobStatus.TIMEDOUT,
                cancelledTs: new Date(),
              },
            })

            let statusRevert: OrderStatus = OrderStatus.TRANSCRIBED
            if (file.order.status === OrderStatus.QC_ASSIGNED) {
              statusRevert = OrderStatus.TRANSCRIBED
            } else if (
              file.order.status === OrderStatus.REVIEWER_ASSIGNED ||
              file.order.status === OrderStatus.FINALIZER_ASSIGNED
            ) {
              statusRevert = OrderStatus.FORMATTED
            }

            await prisma.order.update({
              where: {
                id: file.orderId,
              },
              data: {
                status: statusRevert,
                updatedAt: new Date(),
              },
            })
          })

          rejectedFiles.push(file.order.fileId)

          const emailData = {
            userEmailId: file.user.email,
          }

          const templateData = {
            filename: file.order.File.filename,
            transcriber_assignment_timeout: (
              durationInMs /
              (60 * 60 * 1000)
            ).toFixed(2),
          }
          const ses = getAWSSesInstance()

          switch (file.type) {
            case JobType.REVIEW:
            case JobType.FINALIZE:
              await ses.sendMail('REVIEW_JOB_TIMEOUT', emailData, templateData)
              break
            case JobType.QC:
              await ses.sendMail('QC_JOB_TIMEOUT', emailData, templateData)
              break
          }
        }
      }
    }

    logger.info(
      `Timed out files have been rejected: ${rejectedFiles.join(', ')}`
    )
    return NextResponse.json({
      success: true,
      rejectedFiles,
    })
  } catch (error) {
    logger.error(`Error rejecting timed out files: ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to check timed out files',
      },
      { status: 500 }
    )
  }
}
