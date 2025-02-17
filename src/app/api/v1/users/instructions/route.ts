export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      )
    }
    const userId = user?.internalTeamUserId || user?.userId

    const { instructions } = await req.json()

    await prisma.defaultInstruction.upsert({
      where: { userId },
      update: { instructions: instructions },
      create: { userId, instructions: instructions },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully updated default instructions',
    })
  } catch (err) {
    logger.error(`Error handling default instructions: ${err}`)
    return NextResponse.json(
      { message: 'Failed to update instructions' },
      { status: 500 }
    )
  }
}
