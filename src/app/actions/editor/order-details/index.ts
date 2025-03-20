'use server'

import { JobStatus, OrderType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import config from '../../../../../config.json'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import getOrderUserDetails from '@/services/editor-service/getOrderUserDetails'
import { getSignedURLFromS3 } from '@/utils/backend-helper'

export async function getOrderDetailsAction(fileId: string) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId
  if (!transcriberId) {
    logger.error(`Missing transcriberId for file ${fileId}`)
    return {
      success: false,
      error: 'Missing transcriberId',
    }
  }

  try {
    const order = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
    })

    if (!order) {
      logger.error(`Order not found for ${fileId}`)
      return {
        success: false,
        error: 'Order not found',
      }
    }

    const orderId = order?.id

    const resultJson = await getOrderUserDetails(orderId)

    const file = await prisma.file.findUnique({
      where: {
        fileId: resultJson.file_id,
      },
      select: {
        customFormattingDetails: true,
        duration: true,
      },
    })

    let userRateInfo = null
    const supportingDocuments = []
    if (order.orderType === OrderType.FORMATTING) {
      userRateInfo = await prisma.userRate.findUnique({
        where: {
          userId: order?.userId,
        },
        select: {
          customFormatOption: true,
          outputFormat: true,
        },
      })

      const documents = await prisma.miscJobsAttachments.findMany({
        where: {
          filename: resultJson.file_id,
        },
      })

      if (documents.length > 0) {
        for (const doc of documents) {
          const signedUrl = await getSignedURLFromS3(
            `${doc.fileId}.${doc.fileExtension}`,
            5 * 60 * 60
          )
          supportingDocuments.push({
            filename: doc.originalFilename ?? '',
            signedUrl: signedUrl,
            fileExtension: doc.fileExtension ?? '',
            fileId: doc.fileId,
          })
        }
      }
    }

    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: orderId,
        status: JobStatus.ACCEPTED,
        transcriberId: transcriberId,
      },
      select: {
        acceptedTs: true,
        extensionRequested: true,
      },
    })

    const extensionTimeMultiplier = config.extension_time_multiplier
    const currentTime = new Date()
    const acceptedTime = assignment?.acceptedTs
      ? new Date(assignment.acceptedTs)
      : null
    const duration = file?.duration || 0

    let timeoutMultiplier = 4
    if (duration <= 1800) {
      // Less than 30 mins
      timeoutMultiplier = 6
    } else if (duration <= 10800) {
      // Between 30 mins and 3 hours
      timeoutMultiplier = 5
    }

    const givenTime = duration
      ? duration * timeoutMultiplier + (duration <= 10800 ? 7200 : 0)
      : 0

    let remainingTime = 0
    if (acceptedTime) {
      const elapsedTimeInSeconds = Math.floor(
        (currentTime.getTime() - acceptedTime.getTime()) / 1000
      )
      const baseRemainingTime = Math.max(0, givenTime - elapsedTimeInSeconds)
      const extensionTime =
        assignment?.extensionRequested && duration
          ? duration * extensionTimeMultiplier
          : 0
      remainingTime = baseRemainingTime + extensionTime
    }

    const orderDetails = {
      fileId: resultJson.file_id,
      orderType: resultJson.order_type,
      orderId: resultJson.order_id,
      filename: resultJson.file_name,
      templateName: resultJson.template_name,
      orgName: resultJson.org_name.toLowerCase(),
      cfd: JSON.stringify(file?.customFormattingDetails),
      status: resultJson.status,
      instructions: resultJson.instructions,
      userId: resultJson.user_id,
      remainingTime: remainingTime.toString(),
      duration: file?.duration?.toString(),
      LLMDone: resultJson.LLMDone,
      customFormatOption: userRateInfo?.customFormatOption || null,
      outputFormat: userRateInfo?.outputFormat || null,
      supportingDocuments: supportingDocuments,
      email: resultJson.email,
    }

    logger.info(`orderDetails fetched for file ${resultJson.file_id}`)
    return {
      success: true,
      orderDetails,
    }
  } catch (error) {
    logger.error(`Error fetching order details for file ${fileId}`, error)
    return {
      success: false,
      error: 'Error fetching order details.',
    }
  }
}
