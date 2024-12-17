'use server'

import { JobStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import deliver from '@/services/file-service/deliver'
import preDeliverIfConfigured from '@/services/file-service/pre-deliver-if-configured'

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
      await deliver(orderInformation, currentJobAssignment.transcriberId)
    }

    await prisma.jobAssignment.update({
      where: { id: currentJobAssignment.id },
      data: { status: JobStatus.COMPLETED },
    })

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
