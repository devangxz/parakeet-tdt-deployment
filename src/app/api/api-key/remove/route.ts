import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function DELETE(req: Request) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')
    const userId = user?.internalTeamUserId || user?.userId

    await prisma.apiKey.delete({
      where: {
        userId,
      },
    })

    logger.info(`API key removed for user ${userId}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error(`Error removing API key: ${error}`)
    return NextResponse.json({
      message: 'Failed to remove API key',
      success: false,
    })
  }
}
