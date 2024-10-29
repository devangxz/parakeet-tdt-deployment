export const dynamic = 'force-dynamic'
import { BonusType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId
  try {
    const bonusDetails = await prisma.bonus.findMany({
      where: {
        userId: transcriberId,
        type: BonusType.DAILY,
      },
    })

    logger.info(`Fetched bonus details for ${transcriberId}`)
    return NextResponse.json({ bonusDetails })
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch bonus details' },
      { status: 500 }
    )
  }
}
