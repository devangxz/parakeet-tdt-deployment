import {
  File,
  InputFileType,
  JobStatus,
  JobType,
  Order,
  OrderStatus,
  OrderType,
  ReportMode,
  TestStatus,
} from '@prisma/client'
import axios from 'axios'

import assignFileToReviewer from '../transcribe-service/assign-file-to-review'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import deliver from '@/services/file-service/deliver'
import { QCValidation } from '@/types/editor'
import {
  getTestCustomer,
  getTeamAdminUserDetails,
  getUserRate,
  checkTranscriberWatchlist,
} from '@/utils/backend-helper'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'
import getCustomerTranscript from '@/utils/getCustomerTranscript'
import getOrgName from '@/utils/getOrgName'

type OrderWithFileData =
  | (Order & {
      File: File | null
    })
  | null

async function completeQCJob(order: Order, transcriberId: number) {
  logger.info(`--> completeQCJob ${transcriberId} ${order.fileId}`)

  const orderWithFileData = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      File: true,
    },
  })

  const orgName = await getOrgName(order.userId)
  const isTestCustomer = await getTestCustomer(order.userId)

  const qcCost = await calculateTranscriberCost(
    orderWithFileData as OrderWithFileData,
    transcriberId
  )
  const jobAssignment = await prisma.jobAssignment.findFirst({
    where: {
      orderId: order.id,
      transcriberId,
      type: JobType.QC,
      status: JobStatus.ACCEPTED,
    },
  })

  if (jobAssignment) {
    await prisma.jobAssignment.update({
      where: { id: jobAssignment.id },
      data: {
        status: JobStatus.COMPLETED,
        earnings: isTestCustomer ? 0 : qcCost.cost,
        completedTs: new Date(),
      },
    })
  }
  if (order.status === OrderStatus.QC_ASSIGNED) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.QC_COMPLETED, updatedAt: new Date() },
    })
  }

  const user = await prisma.user.findFirst({ where: { id: transcriberId } })
  const userEmail = user?.email || ''

  if (order.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
    const teamAdminDetails = await getTeamAdminUserDetails(order.userId)
    const customerId = teamAdminDetails ? teamAdminDetails.userId : order.userId
    const userRate = await getUserRate(customerId)
    const skipAssignment = userRate ? userRate.skipAutoAssignment : false
    if (skipAssignment) {
      logger.info(
        `Skipping auto assignment for order ${order.fileId} as skipAutoAssignment is enabled for the customer`
      )
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FORMATTED, updatedAt: new Date() },
      })
      return
    }
    const inputFileType =
      orgName.toLowerCase() === 'remotelegal'
        ? InputFileType.LLM_OUTPUT
        : InputFileType.ASR_OUTPUT
    const changeOrderStatus =
      orgName.toLowerCase() === 'remotelegal' ? false : true

    await assignFileToReviewer(
      order.id,
      order.fileId,
      transcriberId,
      inputFileType,
      'AUTO',
      changeOrderStatus
    )
  }

  logger.info(
    `sending TRANSCRIBER_SUBMIT mail for submitting QC file ${order.fileId} to ${userEmail} for user ${transcriberId}`
  )

  const templateData = {
    file_id: order.fileId,
    subject: 'Scribie Editor Assignment Submitted',
  }
  const ses = getAWSSesInstance()
  await ses.sendMail(
    'TRANSCRIBER_SUBMIT',
    { userEmailId: userEmail },
    templateData
  )

  logger.info(`<-- completeQCJob ${transcriberId}`)
}

export async function submitQCFile(
  orderId: number,
  transcriberId: number,
  transcript: string,
  qcValidation?: QCValidation
) {
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        File: true,
      },
    })

    if (!order) {
      logger.error(`No order found with the given order ID ${orderId}`)
      return {
        success: false,
        message: 'Order not found',
      }
    }

    if (order.status !== OrderStatus.QC_ASSIGNED) {
      logger.error(`Order is not assigned to QC for fileId ${order.fileId}`)
      return {
        success: false,
        message: 'Something went wrong',
      }
    }

    const isTestOrder = order.isTestOrder

    if (isTestOrder) {
      const assignment = await prisma.testAttempt.findFirst({
        where: {
          fileId: order.fileId,
          userId: transcriberId,
          status: TestStatus.ACCEPTED,
        },
      })

      if (!assignment) {
        logger.error(
          `Unauthorized try to submit a QC Test file by user ${transcriberId} for order ${order.fileId}`
        )
        return
      }

      await axios.post(
        `${FILE_CACHE_URL}/save-transcript`,
        {
          fileId: order.fileId,
          transcript: transcript,
          userId: transcriberId,
        },
        {
          headers: {
            'x-api-key': process.env.SCRIBIE_API_KEY,
          },
        }
      )

      if (!isTestOrder && !qcValidation?.isValidationPassed) {
        // await prisma.$transaction(async (prisma) => {
        //   await prisma.testAttempt.update({
        //     where: {
        //       id: assignment.id,
        //     },
        //     data: {
        //       userId: transcriberId,
        //       passed: false,
        //       score: 0,
        //       completedAt: new Date(),
        //       fileId: order.fileId,
        //       status: TestStatus.COMPLETED
        //     },
        //   })
        // })
        await prisma.testAttempt.update({
          where: {
            id: assignment.id,
          },
          data: {
            status: TestStatus.SUBMITTED_FOR_APPROVAL,
            completedAt: new Date(),
          },
        })
        logger.info(
          'Test order, QC validation failed for order',
          order.id,
          transcriberId
        )
      } else {
        await prisma.testAttempt.update({
          where: {
            id: assignment.id,
          },
          data: {
            status: TestStatus.SUBMITTED_FOR_APPROVAL,
            completedAt: new Date(),
          },
        })
      }
      logger.info('Test Order submitted for approval', order.id, transcriberId)
      return
    }

    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId,
        transcriberId,
        type: JobType.QC,
        status: JobStatus.ACCEPTED,
      },
    })

    if (!assignment) {
      logger.error(
        `Unauthorized try to submit a QC file by user ${transcriberId} for fileId ${order.fileId}`
      )
      return {
        success: false,
        message:
          'File is not assigned, it may have timed out, pls check history and try again',
      }
    }

    logger.info(
      `--> submitQCFile ${orderId} ${order.fileId} for transcriber ${transcriberId} and order type ${order.orderType}`
    )

    await axios.post(
      `${FILE_CACHE_URL}/save-transcript`,
      {
        fileId: order.fileId,
        transcript: transcript,
        userId: transcriberId,
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )

    const isTestCustomer = await getTestCustomer(order.userId)

    if (qcValidation && order.status === OrderStatus.QC_ASSIGNED) {
      logger.info(`[${order.fileId}] Submitting QC validation stats for order ${orderId} ${JSON.stringify(order.status)}`)  
      try {
        await prisma.qCValidationStats.create({
          data: {
            orderId,
            fileId: order.fileId,
            transcriberId,
            playedPercentage: qcValidation.playedPercentage,
            werPercentage: qcValidation.werPercentage,
            blankPercentage: qcValidation.blankPercentage,
            editListenCorrelationPercentage:
              qcValidation.editListenCorrelationPercentage,
            speakerChangePercentage: qcValidation.speakerChangePercentage,
            speakerMacroF1Score: qcValidation.speakerMacroF1Score,
            isValidationPassed: qcValidation.isValidationPassed,
          },
        })
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        logger.error(`Failed to create QC validation stats: ${errorMessage}`)
      }
    }else{
      logger.info(`[submitQCFile] Invalid qcValidation stats ${JSON.stringify(qcValidation)} for order ${orderId} and file ${order.fileId} ${JSON.stringify(order.status)}`)
    }

    if (
      qcValidation &&
      !qcValidation.isValidationPassed &&
      order.orderType === OrderType.TRANSCRIPTION &&
      order.status === OrderStatus.QC_ASSIGNED
    ) {
      logger.info(`Quality Criteria failed ${order.fileId}`)

      const qcCost = await calculateTranscriberCost(order, transcriberId)

      await prisma.$transaction(async (prisma) => {
        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            reportMode: ReportMode.AUTO,
            status: OrderStatus.SUBMITTED_FOR_APPROVAL,
          },
        })
        // QC's Earnings is not updated here. It will be updated only when the OM approves
        await prisma.jobAssignment.updateMany({
          where: {
            orderId: order.id,
            transcriberId,
            type: JobType.QC,
            status: JobStatus.ACCEPTED,
          },
          data: {
            status: JobStatus.SUBMITTED_FOR_APPROVAL,
            earnings: isTestCustomer ? 0 : qcCost.cost,
            completedTs: new Date(),
          },
        })
      })
      logger.info(
        `<-- OrderTranscriptionFlow:submitQC - OrderStatus.SUBMITTED_FOR_APPROVAL ${order.fileId} , userId: ${order.userId}`
      )
      return
    }

    const isTranscriberWatchlist = await checkTranscriberWatchlist(
      transcriberId
    )

    if (isTranscriberWatchlist && order.orderType === OrderType.TRANSCRIPTION) {
      logger.info(
        `Transcriber ${transcriberId} is on the watchlist, sending file ${order.fileId} to approval`
      )
      const qcCost = await calculateTranscriberCost(order, transcriberId)
      await prisma.$transaction(async (prisma) => {
        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            reportMode: ReportMode.AUTO,
            status: OrderStatus.SUBMITTED_FOR_APPROVAL,
          },
        })
        await prisma.jobAssignment.updateMany({
          where: {
            orderId: order.id,
            transcriberId,
            type: JobType.QC,
            status: JobStatus.ACCEPTED,
          },
          data: {
            status: JobStatus.SUBMITTED_FOR_APPROVAL,
            earnings: isTestCustomer ? 0 : qcCost.cost,
            completedTs: new Date(),
          },
        })
      })
      return
    }

    await completeQCJob(order, transcriberId)
    logger.info(
      `order ${order.id} Status updated: QC_COMPLETED for Order Type: ${order.orderType}`
    )

    if (order.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
      await prisma.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.REVIEWER_ASSIGNED,
        },
      })
      logger.info(
        `order ${order.id} Status updated: REVIEWER_ASSIGNED for Order Type: ${order.orderType}`
      )
    } else {
      if (order.status === OrderStatus.QC_ASSIGNED) {
        const customerTranscript = await getCustomerTranscript(
          order.fileId,
          transcript
        )

        await axios.post(
          `${FILE_CACHE_URL}/save-transcript`,
          {
            fileId: order.fileId,
            transcript: customerTranscript,
            userId: order.userId,
          },
          {
            headers: {
              'x-api-key': process.env.SCRIBIE_API_KEY,
            },
          }
        )
        await deliver(order, transcriberId)
      }
    }
  } catch (error) {
    logger.error(`Failed to submit order ${orderId}: ${error}`)
    return {
      success: false,
      message: `Failed to submit order ${orderId}: ${error}`,
    }
  }
}
