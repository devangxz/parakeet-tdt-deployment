'use server'

import { FileTag, OrderType } from '@prisma/client'
import axios from 'axios'
import { getServerSession } from 'next-auth'

import { fileCacheTokenAction } from '../../auth/file-cache-token'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import deliver from '@/services/file-service/deliver'
import { uploadToS3 } from '@/utils/backend-helper'
import getCustomerTranscript from '@/utils/getCustomerTranscript'

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
      const tokenRes = await fileCacheTokenAction(session)
      const transcriptRes = await axios.get(
        `${FILE_CACHE_URL}/fetch-transcript?fileId=${orderInformation.fileId}&orderId=${orderInformation.id}`,
        {
          headers: {
            Authorization: `Bearer ${tokenRes.token}`,
          },
        }
      )

      const transcript = transcriptRes.data.result.transcript
      const customerTranscript = await getCustomerTranscript(
        orderInformation.fileId,
        transcript
      )

      const { VersionId } = await uploadToS3(
        `${orderInformation.fileId}.txt`,
        customerTranscript
      )

      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId: orderInformation.fileId,
          tag: FileTag.CUSTOMER_DELIVERED,
        },
      })

      await prisma.fileVersion.update({
        where: {
          id: fileVersion?.id,
        },
        data: {
          s3VersionId: VersionId,
        },
      })
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
