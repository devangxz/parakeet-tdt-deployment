import { WithdrawalStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processTranscriberPayment } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const { invoiceIds } = await req.json()
  try {
    const withdrawal = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.INITIATED,
        invoiceId: {
          in: invoiceIds,
        },
      },
    })

    if (withdrawal.length === 0) {
      logger.error(`Withdrawal invoice not found`)
      return NextResponse.json({
        success: false,
        message: 'Withdrawal invoice not found',
      })
    }

    const processPayment = await processTranscriberPayment(invoiceIds)
    if (!processPayment) {
      logger.error(`Error processing payment for withdrawal`)
      return NextResponse.json({
        success: false,
        message: 'Mass pay failed',
      })
    }

    await prisma.withdrawal.updateMany({
      where: {
        invoiceId: {
          in: invoiceIds,
        },
      },
      data: {
        status: WithdrawalStatus.COMPLETED,
        completedAt: new Date(),
      },
    })

    logger.info(`Withdrawal completed successfully`)
    return NextResponse.json({
      success: true,
      message: 'Withdrawal completed successfully',
    })
  } catch (error) {
    logger.error(`Error completing withdrawal`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
