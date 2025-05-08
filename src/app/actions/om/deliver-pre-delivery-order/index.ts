'use server'

import { FileTag, OrderType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { createCustomerTranscript } from '@/services/file-service/customer-transcript'
import deliver from '@/services/file-service/deliver'

export async function deliverPreDeliveryOrder(
  orderId: number,
  isReReview: boolean
) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const omId = user?.userId as number
  try {
    if (!orderId) {
      return {
        success: false,
        message: 'Order Id parameter is required.',
      }
    }

    const orderInformation = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, message: 'Order not found' }
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
      },
    })

    if (order?.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
      const OMFileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId: orderInformation.fileId,
          tag: FileTag.CF_OM_DELIVERED,
          userId: omId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })

      if (OMFileVersion && OMFileVersion.s3VersionId) {
        await prisma.fileVersion.create({
          data: {
            fileId: orderInformation.fileId,
            tag: FileTag.CF_CUSTOMER_DELIVERED,
            userId: order?.userId,
            s3VersionId: OMFileVersion?.s3VersionId,
          },
        })
      } else {
        const finalizerFileVersion = await prisma.fileVersion.findFirst({
          where: {
            fileId: orderInformation.fileId,
            tag: FileTag.CF_FINALIZER_SUBMITTED,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        })

        await prisma.fileVersion.create({
          data: {
            fileId: orderInformation.fileId,
            tag: FileTag.CF_CUSTOMER_DELIVERED,
            userId: order?.userId,
            s3VersionId: finalizerFileVersion?.s3VersionId,
          },
        })
      }
    }

    if (order?.orderType === OrderType.FORMATTING) {
      const OMFileVersions = await prisma.fileVersion.findMany({
        where: {
          fileId: orderInformation.fileId,
          tag: FileTag.CF_OM_DELIVERED,
          userId: omId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })

      if (OMFileVersions && OMFileVersions.length > 0) {
        await prisma.fileVersion.createMany({
          data: OMFileVersions.map((omVersion) => ({
            fileId: orderInformation.fileId,
            tag: FileTag.CF_CUSTOMER_DELIVERED,
            userId: order?.userId,
            s3Key: omVersion.s3Key,
            s3VersionId: omVersion.s3VersionId,
            extension: omVersion.extension,
          })),
        })
      } else {
        const finalizerFileVersions = await prisma.fileVersion.findMany({
          where: {
            fileId: orderInformation.fileId,
            tag: FileTag.CF_FINALIZER_SUBMITTED,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        })

        if (finalizerFileVersions.length > 0) {
          await prisma.fileVersion.createMany({
            data: finalizerFileVersions.map((finalizerVersion) => ({
              fileId: orderInformation.fileId,
              tag: FileTag.CF_CUSTOMER_DELIVERED,
              userId: order?.userId,
              s3Key: finalizerVersion.s3Key,
              s3VersionId: finalizerVersion.s3VersionId,
              extension: finalizerVersion.extension,
            })),
          })
        }
      }
    }

    if (order?.orderType === OrderType.TRANSCRIPTION) {
      await createCustomerTranscript(orderInformation.fileId, orderInformation.userId)
    }

    await deliver(orderInformation, omId)

    if (isReReview) {
      await prisma.order.update({
        where: { id: Number(orderId) },
        data: {
          reReview: false,
        },
      })
    }

    logger.info(`Successfully delivered pre delivery file ${orderId}`)
    return {
      success: true,
      message: 'Successfully delivered file',
    }
  } catch (error) {
    logger.error(`Failed to deliver pre delivery file`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
