import { WithdrawalStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const initiatedWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.INITIATED,
      },
    })

    logger.info(`Fetched initiated withdrawals successfully`)
    return NextResponse.json({
      success: true,
      withdrawals: initiatedWithdrawals ?? [],
    })
  } catch (error) {
    logger.error(`Error fetching initiated withdrawals`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
