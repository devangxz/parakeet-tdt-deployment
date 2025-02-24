import {
  FileTag,
  JobStatus,
  JobType,
  Order,
  OrderStatus,
  OrderType,
} from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import { getTestCustomer } from '@/utils/backend-helper'
import calculateTranscriberCost from '@/utils/calculateTranscriberCost'

export async function submitFinalize(
  transcriberId: number,
  order: Order,
  finalizerComment: string
) {
  logger.info(`--> OrderTranscriptionCFFlow:submitFinalize ${order.fileId}`)
  try {
    if (
      order.orderType != OrderType.TRANSCRIPTION_FORMATTING &&
      order.orderType != OrderType.FORMATTING
    ) {
      logger.error(
        `OrderFlow:submitFinalize - Order ${order.id}-${order.orderType} is not supported`
      )
      return {
        success: false,
        message: `Order ${order.id} is not supported`,
      }
    }

    if (order.status === OrderStatus.FINALIZING_COMPLETED) {
      logger.error(
        `OrderFlow:submitReview - Order ${order.id}-${order.fileId} has already been submitted by review`
      )
      return {
        success: false,
        message: `Order ${order.id} has already been submitted by review`,
      }
    }

    const fileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId: order.fileId,
        tag: FileTag.CF_FINALIZER_SUBMITTED,
        userId: transcriberId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!fileVersion?.s3VersionId) {
      logger.error(
        `OrderFlow:submitReview - Finalize docx file ${order.fileId} has not been uploaded yet for`
      )
      throw new Error(
        `OrderFlow:submitReview - Finalize docx file ${order.fileId} has not been uploaded yet`
      )
    }

    const isTestCustomer = await getTestCustomer(order.userId)

    await prisma.$transaction(async (prisma) => {
      const orderFile = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          File: true,
        },
      })
      const cf_cost = await calculateTranscriberCost(orderFile, transcriberId)
      await prisma.jobAssignment.updateMany({
        where: {
          orderId: order.id,
          transcriberId,
          type: JobType.FINALIZE,
          status: JobStatus.ACCEPTED,
        },
        data: {
          status: JobStatus.COMPLETED,
          earnings: isTestCustomer ? 0 : cf_cost.cost,
          completedTs: new Date(),
        },
      })
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FINALIZING_COMPLETED },
      })
    })

    await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveredTs: new Date(),
        deliveredBy: transcriberId,
        status: OrderStatus.PRE_DELIVERED,
        updatedAt: new Date(),
        finalizerComment: finalizerComment.trim() || null,
      },
    })

    const templateData = {
      file_id: order.fileId,
      subject: 'Scribie.ai Finalizer Assignment Submitted',
    }
    await sendTemplateMail('TRANSCRIBER_SUBMIT', transcriberId, templateData)

    return {
      success: true,
      message: ` Finalize order ${order.id} submitted successfully`,
    }
  } catch (error) {
    logger.error(
      `OrderTranscriptionCFFlow:submitFinalize ${order.id}-${order.fileId} ${(
        error as Error
      ).toString()}`
    )
    return {
      success: false,
      message: `Failed to submit finalize order ${order.id}: ${error}`,
    }
  }
}
