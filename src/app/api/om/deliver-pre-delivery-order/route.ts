import { FileTag, OrderType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import deliver from '@/services/file-service/deliver'
import axiosInstance from '@/utils/axios'
import { uploadToS3 } from '@/utils/backend-helper'
import getCustomerTranscript from '@/utils/getCustomerTranscript'

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const omId = user?.userId
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({
        success: false,
        message: 'Order Id parameter is required.',
      })
    }

    const orderInformation = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${orderId}`)
      return NextResponse.json({ success: false, message: 'Order not found' })
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId)
      }
    })

    if (order?.orderType === OrderType.TRANSCRIPTION_FORMATTING) {
      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId: orderInformation.fileId,
          tag: FileTag.CF_OM_DELIVERED,
          userId: omId,
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
          s3VersionId: fileVersion?.s3VersionId,
        }
      })
    }

    if (order?.orderType === OrderType.TRANSCRIPTION) {
      const transcriptRes = await axiosInstance.get(`${FILE_CACHE_URL}/fetch-transcript?fileId=${orderInformation.fileId}&orderId=${orderInformation.id}&userId=${omId}`, {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY
        }
      })

      const transcript = transcriptRes.data.result.transcript;
      const customerTranscript = await getCustomerTranscript(orderInformation.fileId, transcript);

      const { VersionId } = await uploadToS3(`${orderInformation.fileId}.txt`, customerTranscript);

      const fileVersion = await prisma.fileVersion.findFirst({
        where: {
          fileId: orderInformation.fileId,
          tag: FileTag.CUSTOMER_DELIVERED,
        }
      })

      console.log(VersionId)

      await prisma.fileVersion.update({
        where: {
          id: fileVersion?.id
        },
        data: {
          s3VersionId: VersionId
        }
      })
    }

    await deliver(orderInformation, omId)

    logger.info(
      `Successfully delivered pre delivery file ${orderId} by user ${user?.user}`
    )
    return NextResponse.json({
      success: true,
      message: 'Successfully delivered file',
    })
  } catch (error) {
    logger.error(`Failed to deliver pre delivery file`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
