export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

interface TeamMember {
  fullname: string | null
  email: string
  status: string
  userId: number
  teamId: number
  role: string
}

interface TeamMembersResponse {
  is_group_admin: boolean
  is_invited: boolean
  is_requested: boolean
  team_members: TeamMember[]
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const searchParams = req.nextUrl.searchParams
    const teamId = Number(searchParams.get('teamId'))

    if (!teamId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!team) {
      logger.error(`Team not found, ${userId}`)
      return NextResponse.json({ message: 'Team not found.' }, { status: 404 })
    }

    const members: TeamMembersResponse = {
      is_group_admin: false,
      is_invited: false,
      is_requested: false,
      team_members: [],
    }

    team.members.forEach((member) => {
      if (member.userId === userId) {
        members.is_group_admin =
          member.role === 'SUPER_ADMIN' || member.role === 'TEAM_ADMIN'
            ? true
            : false
        members.is_invited = member.status === 'INVITED' ? true : false
      }

      if (member.role !== 'INTERNAL_TEAM_USER') {
        members.team_members.push({
          fullname: member.user.firstname
            ? `${member.user.firstname} ${member.user.lastname}`
            : null,
          email: member.user.email,
          status: member.status,
          userId: member.userId,
          teamId: member.teamId,
          role: member.role,
        })
      }
    })

    logger.info(
      `Found ${members.team_members.length} team members of team ${team.name} for user ${userId}`
    )

    return NextResponse.json({
      success: true,
      data: members,
    })
  } catch (error) {
    logger.error(`Failed to get team members, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
