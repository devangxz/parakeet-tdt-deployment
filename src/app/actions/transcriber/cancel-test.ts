'use server'

import { JobStatus, OrderStatus } from '@prisma/client'

import { getTestTranscriberUserAccount } from './get-test-transcriber-user-account'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface CancelTestResponse {
  success: boolean
  error?: string
}

export async function cancelTest(
  userId: number,
  orderId: number
): Promise<CancelTestResponse> {
  try {
    const testTranscriberUserAccount = await getTestTranscriberUserAccount()

    if (!testTranscriberUserAccount.userId) {
      return {
        success: false,
        error: 'Failed to cancel test',
      }
    }
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        isTestOrder: true,
      },
      include: {
        File: true,
      },
    })

    if (!order) {
      return {
        success: false,
        error: 'Test order not found',
      }
    }

    const jobAssignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId,
        transcriberId: userId,
        type: 'TEST',
        status: JobStatus.ACCEPTED,
      },
    })

    if (!jobAssignment) {
      return {
        success: false,
        error: 'No test assignment found',
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredTs: new Date(),
        },
      })

      await tx.jobAssignment.update({
        where: { id: jobAssignment.id },
        data: {
          status: JobStatus.CANCELLED,
          cancelledTs: new Date(),
        },
      })

      await tx.testAttempt.create({
        data: {
          userId,
          passed: false,
          score: 0,
          completedAt: new Date(),
          fileId: order.fileId,
        },
      })
      await tx.file.create({
        data: {
          userId: testTranscriberUserAccount.userId as number,
          fileId: order.fileId,
          filename: order.File?.filename ?? '',
          duration: order.File?.duration ?? 0,
          filesize: order.File?.filesize ?? '',
          isTestFile: true,
          uploadedBy: testTranscriberUserAccount.userId as number,
        },
      })
    })

    logger.info(
      `Test cancelled successfully for user ${userId}, order ${orderId}`
    )
    return {
      success: true,
    }
  } catch (error) {
    logger.error(`Error cancelling test: ${error}`)
    return {
      success: false,
      error: 'Failed to cancel test',
    }
  }
}
