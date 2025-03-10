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
        `OrderFlow:submitFinalize - Order ${order.id}-${order.fileId} has already been submitted by finalizer`
      )
      return {
        success: false,
        message: `Order ${order.id} has already been submitted by finalizer`,
      }
    }

    if (order.orderType === OrderType.FORMATTING) {
      const finalizerVersions = await prisma.fileVersion.findMany({
        where: {
          fileId: order.fileId,
          tag: FileTag.CF_FINALIZER_SUBMITTED,
          userId: transcriberId,
        },
      })

      if (finalizerVersions.length === 0) {
        logger.error(
          `OrderFlow:submitFinalize - No formatting files uploaded by finalizer for ${order.fileId}`
        )
        throw new Error(
          `OrderFlow:submitFinalize - No formatting files have been uploaded by finalizer`
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
        for (const version of finalizerVersions) {
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
              `OrderFlow:submitFinalize - Missing required format ${format} (have ${
                uploadedFormatCounts[format] || 0
              }, need ${count})`
            )
            throw new Error(
              `OrderFlow:submitFinalize - Missing required format ${format} (have ${
                uploadedFormatCounts[format] || 0
              }, need ${count})`
            )
          }
        }

        for (const [format, count] of Object.entries(uploadedFormatCounts)) {
          if (!requiredFormatCounts[format]) {
            logger.error(
              `OrderFlow:submitFinalize - Unexpected format ${format} uploaded by finalizer`
            )
            throw new Error(
              `OrderFlow:submitFinalize - Unexpected format ${format} uploaded by finalizer`
            )
          }
          if (count > requiredFormatCounts[format]) {
            logger.error(
              `OrderFlow:submitFinalize - Too many ${format} files uploaded by finalizer (have ${count}, need ${requiredFormatCounts[format]})`
            )
            throw new Error(
              `OrderFlow:submitFinalize - Too many ${format} files uploaded by finalizer (have ${count}, need ${requiredFormatCounts[format]})`
            )
          }
        }
      }
    } else {
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
          `OrderFlow:submitFinalize - Finalize docx file ${order.fileId} has not been uploaded yet`
        )
        throw new Error(
          `OrderFlow:submitFinalize - Finalize docx file ${order.fileId} has not been uploaded yet`
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
      message: `Finalize order ${order.id} submitted successfully`,
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
