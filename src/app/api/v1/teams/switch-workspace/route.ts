/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { TeamMemberRole } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req)
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const userId = user?.userId as number
  let teamName = null
  let selectedUserTeamRole = null

  let { internalTeamUserId } = await req.json()

  try {
    if (internalTeamUserId === 'null') {
      await prisma.customer.update({
        where: {
          userId,
        },
        data: {
          lastSelectedInternalTeamUserId: null,
        },
      })

      return NextResponse.json({ success: true, data: [] })
    }

    const teamExists = await prisma.teamMember.findFirst({
      where: {
        userId: parseInt(internalTeamUserId),
      },
    })

    if (!teamExists) {
      logger.error(`Team not found ${internalTeamUserId}`)
      return NextResponse.json({ success: false, error: 'Team not found' })
    }

    const userTeamRole = await prisma.teamMember.findFirst({
      where: {
        userId: userId,
        teamId: teamExists.teamId,
      },
    })

    if (!userTeamRole) {
      logger.error(`User not found in the team ${internalTeamUserId}`)
      return NextResponse.json({
        success: false,
        error: 'User not found in the team',
      })
    }

    selectedUserTeamRole = userTeamRole.role
    const teams = await prisma.teamMember.findMany({
      where: {
        userId: parseInt(internalTeamUserId),
        role: TeamMemberRole.INTERNAL_TEAM_USER,
      },
      include: {
        team: true,
      },
    })

    internalTeamUserId = teams[0].userId.toString()
    teamName = teams[0].team.name
    const teamId = teams[0].team.id

    const adminTeamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        role: 'SUPER_ADMIN',
      },
      include: {
        user: {
          include: {
            UserRate: true,
            Customer: true,
            Organization: true,
          },
        },
      },
    })

    await prisma.customer.update({
      where: {
        userId,
      },
      data: {
        lastSelectedInternalTeamUserId: internalTeamUserId,
      },
    })

    const { iat, exp, ...userWithoutIatExp } = user as {
      iat?: number
      exp?: number
    }

    const details = {
      internalTeamUserId: parseInt(internalTeamUserId),
      teamName,
      selectedUserTeamRole,
      customPlan: adminTeamMember?.user?.Customer?.customPlan || false,
      orderType: adminTeamMember?.user.UserRate?.orderType || 'TRANSCRIPTION',
      organizationName: adminTeamMember?.user.Organization?.name || 'NONE',
    }

    logger.info(
      `Switched workspace to ${teamName || 'My Workspace'} for ${userId}`
    )
    return NextResponse.json({ success: true, data: details })
  } catch (error) {
    logger.error(`Failed to switch workspace, ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again later.',
    })
  }
}
