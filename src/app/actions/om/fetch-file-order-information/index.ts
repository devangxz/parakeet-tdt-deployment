'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import calculateFileCost from '@/utils/calculateFileCost'

export async function fetchFileOrderInformation(fileId: string) {
  try {
    if (!fileId) {
      return {
        success: false,
        message: 'File id parameter is required.',
      }
    }

    const orderInformation = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
      include: {
        File: true,
        Assignment: {
          include: {
            user: true,
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
        },
      }
    }

    return {
      success: true,
      details: null,
    }
  } catch (error) {
    logger.error(`Error while fetching order information`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
