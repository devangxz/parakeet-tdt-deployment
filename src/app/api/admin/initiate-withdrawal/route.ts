import { WithdrawalStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const { invoiceIds } = await req.json()
  try {
    const withdrawal = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.PENDING,
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

    await prisma.withdrawal.updateMany({
      where: {
        invoiceId: {
          in: invoiceIds,
        },
      },
      data: {
        status: WithdrawalStatus.INITIATED,
      },
    })

    logger.info(`Withdrawal initiated successfully`)
    return NextResponse.json({
      success: true,
      message: 'Withdrawal initiated successfully',
    })
  } catch (error) {
    logger.error(`Error initiating withdrawal`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
