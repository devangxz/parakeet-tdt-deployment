'use server'

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

    const testAttempt = await prisma.testAttempt.findFirst({
      where: {
        fileId: order.fileId,
        userId,
        status: 'ACCEPTED',
      },
    })

    if (!testAttempt) {
      return {
        success: false,
        error: 'No test attempt found',
      }
    }

    await prisma.testAttempt.update({
      where: { id: testAttempt.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        passed: false,
        score: 0,
      },
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
