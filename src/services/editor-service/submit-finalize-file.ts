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
import { getMaxFormatFiles } from '@/utils/editorUtils'

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

      const maxFiles = getMaxFormatFiles(order.userId?.toString())
      if (finalizerVersions.length > maxFiles) {
        logger.error(
          `OrderFlow:submitFinalize - Too many files uploaded by finalizer: ${finalizerVersions.length} (maximum is ${maxFiles})`
        )
        throw new Error(
          `OrderFlow:submitFinalize - Too many files uploaded by finalizer (maximum is ${maxFiles})`
        )
      }

      const userRate = await prisma.userRate.findUnique({
        where: { userId: order.userId },
      })

      if (userRate?.outputFormat) {
        const formatArray = userRate.outputFormat
          .split(',')
          .map((format) => format.trim().toLowerCase())
          .filter((format) => format !== '')
        const allowedFormats = Array.from(new Set(formatArray))

        const uploadedExtensions = finalizerVersions
          .map((v) => v.extension?.toLowerCase())
          .filter(Boolean)
        const invalidExtensions = uploadedExtensions.filter(
          (ext) => !allowedFormats.includes(ext as string)
        )

        if (invalidExtensions.length > 0) {
          logger.error(
            `OrderFlow:submitFinalize - Invalid file formats uploaded by finalizer: ${invalidExtensions.join(
              ', '
            )}`
          )
          throw new Error(
            `OrderFlow:submitFinalize - Invalid file formats uploaded by finalizer: ${invalidExtensions.join(
              ', '
            )}`
          )
        }

        if (uploadedExtensions.length === 0) {
          logger.error(
            `OrderFlow:submitFinalize - No valid files uploaded by finalizer for ${order.fileId}`
          )
          throw new Error(
            `OrderFlow:submitFinalize - No valid files have been uploaded by finalizer`
          )
        }

        const uploadedFormatCounts: Record<string, number> = {}
        for (const ext of uploadedExtensions) {
          if (ext) {
            uploadedFormatCounts[ext] = (uploadedFormatCounts[ext] || 0) + 1
          }
        }

        logger.info(
          `OrderFlow:submitFinalize - Formats uploaded by finalizer for ${
            order.fileId
          }: ${Object.entries(uploadedFormatCounts)
            .map(([format, count]) => `${format}(${count})`)
            .join(', ')}`
        )
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

    if (finalizerComment.trim()) {
      try {
        const fileInfo = await prisma.file.findUnique({
          where: { fileId: order.fileId },
        })

        const reviewerAssignment = await prisma.jobAssignment.findFirst({
          where: {
            orderId: order.id,
            type: JobType.REVIEW,
            status: JobStatus.COMPLETED,
          },
        })

        if (reviewerAssignment) {
          const feedbackTemplateData = {
            fileId: order.fileId,
            fileName: fileInfo?.filename || order.fileId,
            feedback: finalizerComment.trim(),
          }
          await sendTemplateMail(
            'CUSTOM_FORMATTING_FEEDBACK',
            reviewerAssignment.transcriberId,
            feedbackTemplateData
          )
        }
      } catch (error) {
        logger.error(`Failed to send feedback email: ${error}`)
      }
    }

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
