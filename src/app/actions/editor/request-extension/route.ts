'use server'

import { JobStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function requestExtensionAction(orderId: number) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId

    if (!orderId) {
      return {
        success: false,
        error: 'Missing required parameters',
      }
    }

    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: Number(orderId),
        transcriberId,
        status: JobStatus.ACCEPTED,
      },
    })

    if (!assignment) {
      return {
        success: false,
        error: 'No assignment found',
      }
    }

    await prisma.jobAssignment.update({
      where: {
        id: assignment.id,
      },
      data: {
        extensionRequested: true,
      },
    })

    return {
      success: true,
      message: 'Extension requested successfully',
    }
  } catch (err) {
    logger.error(
      `An error occurred while requesting extension for the order: ${
        (err as Error).message
      }`
    )
    return {
      success: false,
      error: 'Failed to request extension.',
    }
  }
}
