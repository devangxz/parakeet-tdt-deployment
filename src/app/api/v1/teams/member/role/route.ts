import { TeamMemberRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const { memberEmail, teamId, memberRole } = await req.json()

    if (!memberEmail || !teamId || !memberRole) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const memberUser = await prisma.user.findUnique({
      where: { email: memberEmail },
    })

    if (!memberUser) {
      logger.error(`User not found for team ${teamId}`)
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    await prisma.teamMember.updateMany({
      where: {
        userId: memberUser.id,
        teamId,
      },
      data: {
        role: memberRole as TeamMemberRole,
      },
    })

    logger.info(
      `Successfully changed user ${memberEmail} role to ${memberRole} for team ${teamId} by ${userId}`
    )

    return NextResponse.json({ message: 'Successfully changed user role' })
  } catch (error) {
    logger.error(`Failed to change user role, ${error}`)
    return NextResponse.json(
      { message: 'An error occurred. Please try again after some time.' },
      { status: 500 }
    )
  }
}
