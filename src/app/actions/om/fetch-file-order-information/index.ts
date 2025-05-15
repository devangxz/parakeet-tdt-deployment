'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'

export async function fetchFileOrderInformation(fileId: string) {
  try {
    if (!fileId) {
      return {
        success: false,
        message: `File id parameter is required.`,
      }
    }

    const orderInformation = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
      include: {
        File: true,
        user: true,
        Assignment: {
          include: {
            user: true,
          },
        },
      },
    })

    const cancellations = await prisma.cancellations.findMany({
      where: {
        fileId: fileId,
      },
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    })

    if (orderInformation) {
      const fileCost = await calculateFileCost(orderInformation)
      return {
        success: true,
        details: {
          ...orderInformation,
          fileCost,
          cancellations,
        },
      }
    }

    return {
      success: true,
      details: null,
      message: 'No order information found.',
    }
  } catch (error) {
    logger.error(`Error while fetching order information`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
