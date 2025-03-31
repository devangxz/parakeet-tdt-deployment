'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function fetchTestApprovalFiles() {
  try {
    const testAttempts = await prisma.testAttempt.findMany({
      where: {
        status: 'SUBMITTED_FOR_APPROVAL',
      },
      include: {
        user: true,
      },
    })

    const orders = await Promise.all(
      testAttempts.map(async (testAttempt) => {
        const order = await prisma.order.findUnique({
          where: { fileId: testAttempt.fileId },
          include: {
            File: true,
          },
        })
        if (order) {
          return {
            ...order,
            transcriberId: testAttempt.userId,
            testAttempt: {
              ...testAttempt,
            },
          }
        }
      })
    )

    logger.info(`fetched test approval files`)
    return {
      success: true,
      details: orders,
    }
  } catch (error) {
    logger.error(`Error while fetching test approval files`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
