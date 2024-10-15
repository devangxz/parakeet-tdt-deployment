/* eslint-disable @typescript-eslint/no-unused-vars */
import { TeamMemberRole } from '@prisma/client'
import { NextResponse } from 'next/server'

import { signJwtAccessToken } from '@/lib/jwt'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const body = await req.json()
  const userId = user?.userId
  let { internalTeamUserId } = body
  let teamName = null
  let selectedUserTeamRole = null

  try {
    if (internalTeamUserId === 'null') {
      const { iat, exp, ...userWithoutIatExp } = user as {
        iat?: number
        exp?: number
      }

      const userDetails = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          Customer: true,
          UserRate: true,
          Organization: true,
        },
      })

      const payload = {
        ...userWithoutIatExp,
        internalTeamUserId: null,
        teamName: null,
        selectedUserTeamRole: null,
        customPlan: userDetails?.Customer?.customPlan || false,
        orderType: userDetails?.UserRate?.orderType || 'TRANSCRIPTION',
        organizationName: userDetails?.Organization?.name || 'NONE',
      }

      await prisma.customer.update({
        where: {
          userId,
        },
        data: {
          lastSelectedInternalTeamUserId: null,
        },
      })

      const token = signJwtAccessToken(payload)
      const details = {
        token,
        internalTeamUserId: null,
        teamName: null,
        selectedUserTeamRole: null,
        customPlan: userDetails?.Customer?.customPlan || false,
        orderType: userDetails?.UserRate?.orderType || 'TRANSCRIPTION',
        organizationName: userDetails?.Organization?.name || 'NONE',
      }
      return NextResponse.json({ success: true, details })
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
        userId: parseInt(userId),
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

    internalTeamUserId = teams[0].userId
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
        lastSelectedInternalTeamUserId: internalTeamUserId.toString(),
      },
    })

    const { iat, exp, ...userWithoutIatExp } = user as {
      iat?: number
      exp?: number
    }

    const payload = {
      ...userWithoutIatExp,
      internalTeamUserId: internalTeamUserId,
      teamName: teamName,
      selectedUserTeamRole: selectedUserTeamRole,
      customPlan: adminTeamMember?.user?.Customer?.customPlan || false,
      orderType: adminTeamMember?.user.UserRate?.orderType || 'TRANSCRIPTION',
      organizationName: adminTeamMember?.user.Organization?.name || 'NONE',
    }

    const token = signJwtAccessToken(payload)

    const details = {
      token,
      internalTeamUserId,
      teamName,
      selectedUserTeamRole,
      customPlan: adminTeamMember?.user?.Customer?.customPlan || false,
      orderType: adminTeamMember?.user.UserRate?.orderType || 'TRANSCRIPTION',
      organizationName: adminTeamMember?.user.Organization?.name || 'NONE',
    }

    logger.info(
      `Switched workspace to ${teamName || 'My Workspace'} for ${userId}`
    )
    return NextResponse.json({ success: true, details })
  } catch (error) {
    logger.error(`Failed to switch workspace, ${error}`)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again later.',
    })
  }
}
