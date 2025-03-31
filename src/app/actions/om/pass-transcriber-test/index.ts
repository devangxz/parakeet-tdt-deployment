'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function passTranscriberTest(fileId: string, userId: number) {
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

    if (testAttempt.status !== 'SUBMITTED_FOR_APPROVAL') {
      logger.error(`Test attempt is not submitted for approval for ${fileId}`)
      return {
        success: false,
        message: 'Test attempt is not submitted for approval',
      }
    }

    const transcriberId = testAttempt.userId

    await prisma.$transaction(async (tx) => {
      await tx.testAttempt.update({
        where: { id: testAttempt.id },
        data: {
          status: 'COMPLETED',
          passed: true,
          completedAt: new Date(),
        },
      })

      await tx.user.update({
        where: { id: transcriberId },
        data: {
          role: 'QC',
        },
      })

      await tx.verifier.upsert({
        where: { userId: transcriberId },
        update: {
          qcDisabled: false,
        },
        create: {
          userId: transcriberId,
          qcDisabled: false,
        },
      })
    })

    logger.info(
      `Successfully passed transcriber test for transcriber ${transcriberId}, file ${fileId}`
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
