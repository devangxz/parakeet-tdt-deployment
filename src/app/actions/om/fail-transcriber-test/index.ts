'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function failTranscriberTest(fileId: string, userId: number) {
  try {
    if (!fileId) {
      return {
        success: false,
        message: 'File Id parameter is required.',
      }
    }

    const testAttempt = await prisma.testAttempt.findFirst({
      where: { fileId, status: 'SUBMITTED_FOR_APPROVAL', userId },
    })

    if (!testAttempt) {
      logger.error(`Test attempt not found for ${fileId}`)
      return {
        success: false,
        message: 'Test attempt not found',
      }
    }

    const transcriberId = testAttempt.userId

    await prisma.testAttempt.update({
      where: { id: testAttempt.id },
      data: {
        status: 'COMPLETED',
        passed: false,
        completedAt: new Date(),
      },
    })

    logger.info(
      `Failed transcriber test for transcriber ${transcriberId}, file ${fileId}`
    )
    return {
      success: true,
      message: 'Failed transcriber test',
    }
  } catch (error) {
    logger.error(`Failed to record transcriber test failure`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
