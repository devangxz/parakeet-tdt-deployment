import { WithdrawalStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.PENDING,
      },
    })

    logger.info(`Fetched pending withdrawals successfully`)
    return NextResponse.json({
      success: true,
      withdrawals: pendingWithdrawals ?? [],
    })
  } catch (error) {
    logger.error(`Error fetching pending withdrawals`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
