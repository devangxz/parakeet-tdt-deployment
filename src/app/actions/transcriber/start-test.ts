'use server'

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
        status: {
          in: ['COMPLETED', 'CANCELLED', 'SUBMITTED_FOR_APPROVAL'],
        },
      },
    })

    if (failedAttempts >= 3) {
      return {
        success: false,
        error: 'You have exceeded the maximum number of test attempts',
      }
    }

    const currentAssignment = await prisma.testAttempt.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
      },
    })

    if (currentAssignment) {
      return {
        success: false,
        error: 'You are already working on a test',
      }
    }

    const testAttempt = await prisma.testAttempt.findFirst({
      where: {
        userId,
        fileId,
      },
    })

    if (testAttempt) {
      return {
        success: false,
        error: 'You have already gave test on this file.',
      }
    }

    await prisma.testAttempt.create({
      data: {
        userId,
        fileId,
        status: 'ACCEPTED',
      },
    })

    return {
      success: true,
    }
  } catch (error) {
    logger.error(`Error starting test: ${error}`)
    return {
      success: false,
      error: 'Failed to start test',
    }
  }
}
