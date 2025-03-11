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

export default async function submitReview(
  transcriberId: number,
  order: Order
) {
  logger.info(`--> OrderTranscriptionCFFlow:submitReview ${order.fileId}`)
  try {
    if (
      order.orderType != OrderType.TRANSCRIPTION_FORMATTING &&
      order.orderType != OrderType.FORMATTING
    ) {
      logger.error(
        `OrderFlow:submitReview - Order ${order.id}-${order.orderType} is not supported`
      )
      return {
        success: false,
        message: `Order ${order.id} is not supported`,
      }
    }

    if (order.status === OrderStatus.REVIEW_COMPLETED) {
      logger.error(
        `OrderFlow:submitReview - Order ${order.id}-${order.fileId} has already been submitted by review`
      )
      return {
        success: false,
        message: `Order ${order.id} has already been submitted by review`,
      }
    }

    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: order.id,
        transcriberId,
        type: JobType.REVIEW,
        status: JobStatus.ACCEPTED,
      },
    })

    if (!assignment) {
      logger.error(
        `OrderFlow:submitReview - Unauthorized try to submit a review file by user ${transcriberId} for order ${order.id}`
      )
      throw new Error(
        `OrderFlow: submitReview - Unauthorized try to submit a review file by user ${transcriberId} for order ${order.id}`
      )
    }

    if (order.orderType === OrderType.FORMATTING) {
      const fileVersions = await prisma.fileVersion.findMany({
        where: {
          fileId: order.fileId,
          tag: FileTag.CF_REV_SUBMITTED,
          userId: transcriberId,
        },
      })

      if (fileVersions.length === 0) {
        logger.error(
          `OrderFlow:submitReview - No formatting files uploaded for ${order.fileId}`
        )
        throw new Error(
          `OrderFlow:submitReview - No formatting files have been uploaded`
        )
      }

      const userRate = await prisma.userRate.findUnique({
        where: { userId: order.userId },
      })

      if (userRate?.outputFormat) {
        const requiredFormats = userRate.outputFormat
          .split(',')
          .map((format) => format.trim().toLowerCase())
          .filter((format) => format !== '')

        const requiredFormatCounts: Record<string, number> = {}
        for (const format of requiredFormats) {
          requiredFormatCounts[format] = (requiredFormatCounts[format] || 0) + 1
        }

        const uploadedFormatCounts: Record<string, number> = {}
        for (const version of fileVersions) {
          const ext = version.extension?.toLowerCase()
          if (ext) {
            uploadedFormatCounts[ext] = (uploadedFormatCounts[ext] || 0) + 1
          }
        }

        for (const [format, count] of Object.entries(requiredFormatCounts)) {
          if (
            !uploadedFormatCounts[format] ||
            uploadedFormatCounts[format] < count
          ) {
            logger.error(
              `OrderFlow:submitReview - Missing required format ${format} (have ${
                uploadedFormatCounts[format] || 0
              }, need ${count})`
            )
            throw new Error(
              `OrderFlow:submitReview - Missing required format ${format} (have ${
                uploadedFormatCounts[format] || 0
              }, need ${count})`
            )
          }
        }

        for (const [format, count] of Object.entries(uploadedFormatCounts)) {
          if (!requiredFormatCounts[format]) {
            logger.error(
              `OrderFlow:submitReview - Unexpected format ${format} uploaded`
            )
            throw new Error(
              `OrderFlow:submitReview - Unexpected format ${format} uploaded`
            )
          }
          if (count > requiredFormatCounts[format]) {
            logger.error(
              `OrderFlow:submitReview - Too many ${format} files uploaded (have ${count}, need ${requiredFormatCounts[format]})`
            )
            throw new Error(
              `OrderFlow:submitReview - Too many ${format} files uploaded (have ${count}, need ${requiredFormatCounts[format]})`
            )
          }
        }
      }
    } else {
      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId: order.fileId,
          tag: FileTag.CF_REV_SUBMITTED,
          userId: transcriberId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })

      if (!fileVersion?.s3VersionId) {
        logger.error(
          `OrderFlow:submitReview - Review docx file ${order.fileId} has not been uploaded yet`
        )
        throw new Error(
          `OrderFlow:submitReview - Review docx file ${order.fileId} has not been uploaded yet`
        )
      }
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
          type: JobType.REVIEW,
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
        data: {
          status: OrderStatus.REVIEW_COMPLETED,
          updatedAt: new Date(),
        },
      })
    })

    const templateData = {
      file_id: order.fileId,
      subject: 'Scribie.ai Reviewer Assignment Submitted',
    }

    await sendTemplateMail('TRANSCRIBER_SUBMIT', transcriberId, templateData)

    return {
      success: true,
      message: `Review order ${order.id} submitted successfully`,
    }
  } catch (error) {
    logger.error(
      `OrderTranscriptionCFFlow:submitReview ${order.id}-${order.fileId} ${(
        error as Error
      ).toString()}`
    )
    return {
      success: false,
      message: `Failed to submit review order ${order.id}: ${error}`,
    }
  }
}
