'use server'

import { OrderStatus, ReportOption } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function reportFileAction(
  orderId: number,
  reportOption: string,
  reportComment: string
) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        reportOption: reportOption as ReportOption,
        reportComment,
        status: OrderStatus.SUBMITTED_FOR_SCREENING,
      },
    })

    return {
      success: true,
      message: 'Order reported successfully',
    }
  } catch (err) {
    logger.error(
      `An error occurred while reporting the order: ${(err as Error).message}`
    )
    return {
      success: false,
      error: 'Failed to report the order.',
    }
  }
}
