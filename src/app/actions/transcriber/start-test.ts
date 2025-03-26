'use server'

import { OrderStatus } from '@prisma/client'

import { getTestTranscriberUserAccount } from './get-test-transcriber-user-account'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface StartTestResponse {
  success: boolean
  orderId?: number
  error?: string
}

export async function startTest(
  userId: number,
  fileId: string
): Promise<StartTestResponse> {
  try {
    const testTranscriberUserAccount = await getTestTranscriberUserAccount()

    if (!testTranscriberUserAccount.userId) {
      return {
        success: false,
        error: 'Failed to cancel test',
      }
    }
    const file = await prisma.file.findUnique({
      where: {
        fileId,
        isTestFile: true,
      },
    })

    if (!file) {
      return {
        success: false,
        error: 'Invalid test file',
      }
    }

    const invitation = await prisma.testInvitation.findUnique({
      where: { userId },
    })

    if (!invitation) {
      return {
        success: false,
        error: 'You are not invited for the test',
      }
    }

    const failedAttempts = await prisma.testAttempt.count({
      where: {
        userId,
        passed: false,
      },
    })

    if (failedAttempts >= 3) {
      return {
        success: false,
        error: 'You have exceeded the maximum number of test attempts',
      }
    }

    const currentAssignment = await prisma.jobAssignment.findFirst({
      where: {
        transcriberId: userId,
        status: 'ACCEPTED',
        type: 'TEST',
      },
    })

    if (currentAssignment) {
      return {
        success: false,
        error: 'You are already working on a test',
      }
    }

    const order = await prisma.order.create({
      data: {
        userId: testTranscriberUserAccount.userId as number,
        fileId,
        status: OrderStatus.QC_ASSIGNED,
        tat: 24,
        isTestOrder: true,
        deadlineTs: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    await prisma.jobAssignment.create({
      data: {
        transcriberId: userId,
        orderId: order.id,
        status: 'ACCEPTED',
        earnings: 0,
        type: 'TEST',
        inputFile: 'ASR_OUTPUT',
        assignMode: 'AUTO',
      },
    })

    return {
      success: true,
      orderId: order.id,
    }
  } catch (error) {
    logger.error(`Error starting test: ${error}`)
    return {
      success: false,
      error: 'Failed to start test',
    }
  }
}
