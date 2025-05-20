'use server'

import { JobStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { createCustomerTranscript } from '@/services/file-service/customer-transcript'
import deliver from '@/services/file-service/deliver'
import preDeliverIfConfigured from '@/services/file-service/pre-deliver-if-configured'
import { checkTranscriberWatchlist } from '@/utils/backend-helper'

export async function acceptApprovalOrder(orderId: number) {
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
      return {
        success: false,
        message: 'Order not found',
      }
    }

    const currentJobAssignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: orderInformation.id,
        status: JobStatus.SUBMITTED_FOR_APPROVAL,
      },
    })

    if (!currentJobAssignment) {
      logger.error(`No completed job assignment found for ${orderId}`)
      return {
        success: false,
        message: 'No completed job assignment found',
      }
    }

    const isPreDeliveryEligible = await preDeliverIfConfigured(
      orderInformation,
      currentJobAssignment.transcriberId
    )

    if (!isPreDeliveryEligible) {
      await createCustomerTranscript(
        orderInformation.fileId,
        orderInformation.userId
      )
      await deliver(orderInformation, currentJobAssignment.transcriberId)
    }

    await prisma.jobAssignment.update({
      where: { id: currentJobAssignment.id },
      data: { status: JobStatus.COMPLETED },
    })

    const isTranscriberWatchlist = await checkTranscriberWatchlist(
      currentJobAssignment.transcriberId
    )

    if (isTranscriberWatchlist) {
      const twoMonthsAgo = new Date()
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

      const completedAssignments = await prisma.jobAssignment.count({
        where: {
          transcriberId: currentJobAssignment.transcriberId,
          status: JobStatus.COMPLETED,
          completedTs: {
            gte: twoMonthsAgo,
          },
          type: 'QC',
        },
      })

      if (completedAssignments >= 10) {
        const transcriber = await prisma.user.findUnique({
          where: { id: currentJobAssignment.transcriberId },
          select: { firstname: true, lastname: true, email: true },
        })

        const awsSes = getAWSSesInstance()
        await awsSes.sendAlert(
          `Watchlist Transcriber Completed 10+ Assignments`,
          `${transcriber?.email} has completed 10 or more assignments.`,
          'software'
        )

        logger.info(
          `Alert sent for watchlist transcriber ${currentJobAssignment.transcriberId} with ${completedAssignments} completed assignments`
        )
      }
    }

    const qcValidationStats = await prisma.qCValidationStats.findFirst({
      where: {
        orderId: orderInformation.id,
        fileId: orderInformation.fileId,
        transcriberId: currentJobAssignment.transcriberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (qcValidationStats) {
      await prisma.qCValidationStats.update({
        where: {
          id: qcValidationStats.id,
        },
        data: {
          isAcceptedByOM: true,
        },
      })
    }

    logger.info(`Successfully delivered approval tab file ${orderId}`)
    return {
      success: true,
      message: 'Successfully delivered file',
    }
  } catch (error) {
    logger.error(`Failed to deliver approval tab file`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
