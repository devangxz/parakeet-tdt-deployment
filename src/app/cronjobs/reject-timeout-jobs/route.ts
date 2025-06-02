import { JobStatus, JobType, OrderStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import config from '../../../../config.json'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { calculateTimerDuration } from '@/utils/editorUtils'
import getOrgName from '@/utils/getOrgName'

export async function POST() {
  try {
    const rejectedFiles: string[] = []
    const warningFiles: string[] = []
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

        let durationInMs = calculateTimerDuration(file.order.File.duration)

        if (file.extensionRequested) {
          durationInMs +=
            file.order.File.duration * extensionTimeMultiplier * 1000
        }

        const requiredTime = new Date(Date.now() - durationInMs)
        const warningTime = new Date(Date.now() - durationInMs + 15 * 60 * 1000) // 15 minutes before timeout
        const warningTimeStart = new Date(
          Date.now() - durationInMs + 10 * 60 * 1000
        ) // 10 minutes before timeout

        // Check for warning condition (10-15 minutes before timeout)
        if (
          new Date(file.acceptedTs) < warningTime &&
          new Date(file.acceptedTs) >= warningTimeStart
        ) {
          warningFiles.push(file.order.fileId)

          logger.info(
            `Sending timeout warning email to ${file.user.email} for order ${file.order.id} ${file.order.fileId}`
          )
          const emailData = {
            userEmailId: file.user.email,
          }

          const elapsedTimeInHours = (
            (Date.now() - new Date(file.acceptedTs).getTime()) /
            (60 * 60 * 1000)
          ).toFixed(2)

          const templateData = {
            filename: file.order.File.filename,
            elapsed_time: elapsedTimeInHours,
            fileId: file.order.fileId,
          }

          logger.info(
            `Email data: ${JSON.stringify(
              emailData
            )}, Template data: ${JSON.stringify(templateData)}`
          )

          const ses = getAWSSesInstance()
          await ses.sendMail('QC_JOB_TIMEOUT_WARNING', emailData, templateData)

          logger.info(
            `Timeout warning email sent to ${file.user.email} for order ${file.order.id} ${file.order.fileId}`
          )
        }
        // Check for timeout condition
        else if (new Date(file.acceptedTs) < requiredTime) {
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
            fileId: file.order.fileId,
          }
          const ses = getAWSSesInstance()
          let result

          switch (file.type) {
            case JobType.REVIEW:
            case JobType.FINALIZE:
              result = await ses.sendMail(
                'REVIEW_JOB_TIMEOUT',
                emailData,
                templateData
              )
              break
            case JobType.QC:
              result = await ses.sendMail(
                'QC_JOB_TIMEOUT',
                emailData,
                templateData
              )
              break
          }

          logger.info(`AWS SES Timeout Response: ${JSON.stringify(result)}`)
          logger.info(
            `Timeout email sent to ${file.user.email} for order ${file.order.id} ${file.order.fileId}`
          )
        }
      }
    }

    logger.info(
      `Timed out files have been rejected: ${rejectedFiles.join(', ')}`
    )
    logger.info(`Warning emails sent for files: ${warningFiles.join(', ')}`)
    return NextResponse.json({
      success: true,
      rejectedFiles,
      warningFiles,
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
