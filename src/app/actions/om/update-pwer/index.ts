'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface UpdatePwerActionParams {
  orderId: number
  newPwer: number
}

interface UpdatePwerActionResponse {
  success: boolean
  message?: string
}

export async function updatePwerAction({
  orderId,
  newPwer,
}: UpdatePwerActionParams): Promise<UpdatePwerActionResponse> {
  try {
    if (!orderId) {
      logger.error(`Update PWER attempt with missing Order ID`)
      return {
        success: false,
        message: 'Order ID is required',
      }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        pwer: newPwer,
      },
    })

    logger.info(`PWER updated for order ${orderId} to ${newPwer}`)

    return {
      success: true,
    }
  } catch (error) {
    logger.error(`Error updating PWER for order ${orderId}: ${error}`)
    return {
      success: false,
      message: 'Failed to update PWER',
    }
  }
}
