import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const teams = await prisma.teamMember.findMany({
      where: {
        userId,
      },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            members: {
              where: {
                status: 'ACCEPTED',
                role: 'INTERNAL_TEAM_USER',
              },
            },
          },
        },
      },
    })

    if (!teams || teams.length === 0) {
      logger.info(`No teams found for this user, ${userId}`)
      return NextResponse.json({
        success: true,
        data: {
          teams: [],
          selectedInternalTeamUserId: null,
          selectedUserTeamRole: null,
        },
      })
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId,
      },
    })

    logger.info(`Successfully fetch team details for ${user.email}`)

    if (customer && customer.lastSelectedInternalTeamUserId) {
      const team = await prisma.teamMember.findFirst({
        where: {
          userId: Number(customer.lastSelectedInternalTeamUserId),
        },
      })

      const teamMember = await prisma.teamMember.findFirst({
        where: {
          userId: user.userId,
          teamId: team?.teamId,
        },
        select: {
          role: true,
        },
      })
      return NextResponse.json({
        success: true,
        data: {
          teams: teams.map((team) => ({
            group_id: team.team.id,
            group_name: team.team.name,
            role: team.team.members[0].role,
            internal_team_user_id: team.team.members[0].userId,
          })),
          selected_internal_team_user_id: Number(
            customer.lastSelectedInternalTeamUserId
          ),
          selected_user_team_role: teamMember?.role ?? null,
          selected_group_name: null,
        },
      })
    } else {
      return NextResponse.json({
        success: true,
        data: {
          teams: teams.map((team) => ({
            group_id: team.team.id,
            group_name: team.team.name,
            role: team.team.members[0].role,
            internal_team_user_id: team.team.members[0].userId,
          })),
          selected_internal_team_user_id: null,
          selected_user_team_role: null,
          selected_group_name: null,
        },
      })
    }
  } catch (error) {
    logger.error(`Failed to fetch teams details, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
