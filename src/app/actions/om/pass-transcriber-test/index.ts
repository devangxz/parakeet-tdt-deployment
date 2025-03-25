'use server'

import { JobStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function passTranscriberTest(orderId: number) {
  try {
    if (!orderId) {
      return {
        success: false,
        message: 'Order Id parameter is required.',
      }
    }

    const orderInformation = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        Assignment: {
          where: {
            status: JobStatus.SUBMITTED_FOR_APPROVAL,
            type: 'TEST',
          },
          include: {
            user: true,
          },
        },
      },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${orderId}`)
      return {
        success: false,
        message: 'Order not found',
      }
    }

    if (
      !orderInformation.Assignment ||
      orderInformation.Assignment.length === 0
    ) {
      logger.error(`No test assignment found for ${orderId}`)
      return {
        success: false,
        message: 'No test assignment found',
      }
    }

    const currentJobAssignment = orderInformation.Assignment[0]
    const transcriberId = currentJobAssignment.transcriberId

    await prisma.order.update({
      where: { id: orderInformation.id },
      data: {
        deliveredTs: new Date(),
        deliveredBy: transcriberId,
        status: 'DELIVERED',
        updatedAt: new Date(),
      },
    })

    await prisma.jobAssignment.update({
      where: { id: currentJobAssignment.id },
      data: {
        status: JobStatus.COMPLETED,
        completedTs: new Date(),
      },
    })

    await prisma.testAttempt.create({
      data: {
        userId: transcriberId,
        fileId: orderInformation.fileId,
        passed: true,
        completedAt: new Date(),
      },
    })

    logger.info(
      `Successfully passed transcriber test for transcriber ${transcriberId}, order ${orderId}`
    )
    return {
      success: true,
      message: 'Successfully passed transcriber test',
    }
  } catch (error) {
    logger.error(`Failed to pass transcriber test`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
