/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use server'

import { TeamMemberRole } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import { signJwtAccessToken } from '@/lib/jwt'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface SwitchWorkspacePayload {
  internalTeamUserId: string
}

export async function switchWorkspace({
  internalTeamUserId,
}: SwitchWorkspacePayload) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.userId as number
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
      return { success: true, details }
    }

    const teamExists = await prisma.teamMember.findFirst({
      where: {
        userId: parseInt(internalTeamUserId),
      },
    })

    if (!teamExists) {
      logger.error(`Team not found ${internalTeamUserId}`)
      return { success: false, error: 'Team not found' }
    }

    const userTeamRole = await prisma.teamMember.findFirst({
      where: {
        userId: userId,
        teamId: teamExists.teamId,
      },
    })

    if (!userTeamRole) {
      logger.error(`User not found in the team ${internalTeamUserId}`)
      return {
        success: false,
        error: 'User not found in the team',
      }
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
    return { success: true, details }
  } catch (error) {
    logger.error(`Failed to switch workspace, ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again later.',
    }
  }
}
