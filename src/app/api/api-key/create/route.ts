import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function POST(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')
    const userId = user?.internalTeamUserId || user?.userId
    const apiKey = generateUniqueId()

    await prisma.apiKey.upsert({
      where: {
        userId,
      },
      update: {
        apiKey,
      },
      create: {
        userId,
        apiKey,
      },
    })

    logger.info(`API key generated for user ${userId}`)
    return NextResponse.json({ apiKey, success: true })
  } catch (error) {
    logger.error(`Error generating API key: ${error}`)
    return NextResponse.json({
      message: 'Failed to generate API key',
      success: false,
    })
  }
}
