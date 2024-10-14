import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId
  try {
    const earningDetails = await prisma.miscEarnings.findMany({
      where: {
        userId: transcriberId,
      },
    })

    logger.info(`Fetched misc earnings details for ${transcriberId}`)
    return NextResponse.json({ earningDetails })
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: 'Failed to fetch misc earnings' },
      { status: 500 }
    )
  }
}
