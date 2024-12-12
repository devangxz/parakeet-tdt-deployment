/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { FileTag } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getFileVersionFromS3, uploadToS3 } from '@/utils/backend-helper'
import getCustomerTranscript from '@/utils/getCustomerTranscript'

interface FormattingOptions {
  timeCoding: boolean
  speakerTracking: boolean
  nameFormat: string
}

export async function setFormattingOptionsAction(
  orderId: number,
  formattingOptions: FormattingOptions,
  existingOptions: Record<string, any>,
  newTemplateId: number
) {
  try {
    if (!orderId) {
      logger.error(`Missing orderId parameter`)
      return {
        success: false,
        error: 'Missing orderId parameter',
      }
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
      },
      select: {
        fileId: true,
      },
    })

    if (!order) {
      logger.error(`Order not found for ${orderId}`)
      return {
        success: false,
        error: 'Order not found',
      }
    }

    const invoiceFile = await prisma.invoiceFile.findFirst({
      where: {
        fileId: order.fileId,
      },
      select: {
        invoiceId: true,
      },
    })

    if (!invoiceFile) {
      logger.error(`Invoice not found for file ${order.fileId}`)
      return {
        success: false,
        error: 'Invoice not found',
      }
    }

    const newOptions = {
      ...existingOptions,
      ts: formattingOptions.timeCoding ? 1 : 0,
      sif: formattingOptions.speakerTracking ? 1 : 0,
      si: formattingOptions.nameFormat === 'initials' ? 0 : 1,
      tmp: newTemplateId,
    }

    await prisma.invoice.update({
      where: {
        invoiceId: invoiceFile.invoiceId,
      },
      data: {
        options: JSON.stringify(newOptions),
      },
    })

    const fileVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId: order.fileId,
        tag: FileTag.QC_DELIVERED,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!fileVersion?.s3VersionId) {
      logger.error(
        `File version not found for ${order.fileId} TAG QC_DELIVERED`
      )
      return {
        success: false,
        error: 'File version not found',
      }
    }

    const qcTranscript = (
      await getFileVersionFromS3(
        `${order.fileId}.txt`,
        fileVersion?.s3VersionId
      )
    ).toString()

    const customerTranscript = await getCustomerTranscript(
      order.fileId,
      qcTranscript
    )

    const { VersionId } = await uploadToS3(
      `${order.fileId}.txt`,
      customerTranscript
    )

    const customerEditVersion = await prisma.fileVersion.findFirst({
      where: {
        fileId: order.fileId,
        tag: FileTag.CUSTOMER_EDIT,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!customerEditVersion) {
      await prisma.fileVersion.create({
        data: {
          fileId: order.fileId,
          tag: FileTag.CUSTOMER_EDIT,
          s3VersionId: VersionId,
        },
      })
    } else {
      await prisma.fileVersion.update({
        where: {
          id: customerEditVersion.id,
        },
        data: {
          s3VersionId: VersionId,
        },
      })
    }

    return {
      success: true,
      message: `Formatting options updated successfully for order ${orderId}`,
    }
  } catch (err) {
    logger.error(
      `An error occurred while updating formatting options for order ${orderId}: ${
        (err as Error).message
      }`
    )
    return {
      success: false,
      error: `Failed to update order options for order ${orderId}`,
    }
  }
}
