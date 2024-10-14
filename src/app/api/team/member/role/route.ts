import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.json()
  const { memberEmail, teamId, memberRole } = body
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.userId
  if (!memberEmail || !teamId || !memberRole) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing required fields',
      },
      { status: 400 }
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: memberEmail },
    })

    if (!user) {
      logger.error(`User not found for team ${teamId}`)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.teamMember.updateMany({
      where: {
        userId: user.id,
        teamId,
      },
      data: {
        role: memberRole,
      },
    })

    logger.info(
      `Successfully changed user ${memberEmail} role to ${memberRole} for team ${teamId} by ${userId}`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully changed user role`,
    })
  } catch (error) {
    logger.error(`Failed to change user role, ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
