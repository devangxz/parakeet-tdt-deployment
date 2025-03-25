'use server'

import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface TestStatusResponse {
  success: boolean
  isInvited: boolean
  isPassed: boolean
  failedAttempts: number
  isQC: boolean
  error?: string
}

export async function checkTranscriberTestStatus(
  userId: number
): Promise<TestStatusResponse> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user) {
      return {
        success: false,
        isInvited: false,
        isPassed: false,
        failedAttempts: 0,
        isQC: false,
        error: 'User not found',
      }
    }

    const isQC = user.role === Role.QC

    const invitation = await prisma.testInvitation.findUnique({
      where: { userId },
    })

    const isInvited = !!invitation

    const testAttempts = await prisma.testAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    })

    const failedAttempts = testAttempts.filter(
      (attempt) => !attempt.passed
    ).length

    const isPassed = testAttempts.some((attempt) => attempt.passed)

    return {
      success: true,
      isInvited,
      isPassed,
      failedAttempts,
      isQC,
    }
  } catch (error) {
    logger.error(`Error checking transcriber test status: ${error}`)
    return {
      success: false,
      isInvited: false,
      isPassed: false,
      failedAttempts: 0,
      isQC: false,
      error: 'Failed to check test status',
    }
  }
}
