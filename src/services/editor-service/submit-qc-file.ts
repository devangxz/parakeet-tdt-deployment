import {
  File,
  InputFileType,
  JobStatus,
  JobType,
  Order,
  OrderStatus,
  OrderType,
  ReportMode,
  ReportOption,
} from '@prisma/client'
import axios from 'axios'

import deliver from '../file-service/deliver'
import preDeliverIfConfigured from '../file-service/pre-deliver-if-configured'
import assignFileToReviewer from '../transcribe-service/assign-file-to-review'
import { WORKER_QUEUE_NAMES, workerQueueService } from '../worker-service'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'
import getCustomerTranscript from '@/utils/getCustomerTranscript'
import qualityCriteriaPassed from '@/utils/qualityCriteriaPassed'

type OrderWithFileData =
  | (Order & {
      File: File | null
    })
  | null

async function completeQCJob(order: Order, transcriberId: number) {
  logger.info(`--> completeQCJob ${transcriberId}`)
  await prisma.$transaction(async (prisma) => {
    const orderWithFileData = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        File: true,
      },
    })

    const qcCost = await calculateTranscriberCost(
      orderWithFileData as OrderWithFileData,
      transcriberId
    )
    await prisma.jobAssignment.updateMany({
      where: {
        orderId: order.id,
        transcriberId,
        type: JobType.QC,
        status: JobStatus.ACCEPTED,
      },
      data: {
        status: JobStatus.COMPLETED,
        earnings: qcCost.cost,
        completedTs: new Date(),
      },
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.QC_COMPLETED },
    })
    const user = await prisma.user.findFirst({ where: { id: transcriberId } })
    const userEmail = user?.email || ''

    if (order.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
      await assignFileToReviewer(
        order.id,
        order.fileId,
        transcriberId,
        InputFileType.LLM_OUTPUT,
        false
      )
    }

    logger.info(
      `sending TRANSCRIBER_SUBMIT mail for submitting QC file ${order.fileId} to ${userEmail} for user ${transcriberId}`
    )

    const templateData = {
      file_id: order.fileId,
      subject: 'Scribie.ai Editor Assignment Submitted',
    }
    const ses = getAWSSesInstance()
    await ses.sendMail(
      'TRANSCRIBER_SUBMIT',
      { userEmailId: userEmail },
      templateData
    )
  })

  logger.info(`<-- completeQCJob ${transcriberId}`)
}

export async function submitQCFile(
  orderId: number,
  transcriberId: number,
  transcript: string
) {
  try {
    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId,
        transcriberId,
        type: JobType.QC,
      },
    })

    if (!assignment) {
      logger.error(
        `Unauthorized try to submit a QC file by user ${transcriberId} for order ${orderId}`
      )
    }

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

    const testResult = await qualityCriteriaPassed(order.fileId)

    if (!testResult.result) {
      logger.info(`Quality Criteria failed ${order.fileId}`)

      const qcCost = await calculateTranscriberCost(order, transcriberId)

      await prisma.$transaction(async (prisma) => {
        await prisma.order.update({
          where: {
            id: order.id,
          },
          data: {
            reportMode: ReportMode.AUTO,
            reportOption: ReportOption.AUTO_DIFF_BELOW_THRESHOLD,
            reportComment: testResult.details,
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
            earnings: qcCost.cost,
            completedTs: new Date(),
          },
        })
      })
      logger.info(
        `<-- OrderTranscriptionFlow:submitQC - OrderStatus.SUBMITTED_FOR_APPROVAL`
      )
      return
    }

    await completeQCJob(order, transcriberId)

    if (order.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
      await workerQueueService.createJob(WORKER_QUEUE_NAMES.LLM_MARKING, {
        orderId: order.id,
        fileId: order.fileId,
      })
    } else {
      if ((await preDeliverIfConfigured(order, transcriberId)) === false) {
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
