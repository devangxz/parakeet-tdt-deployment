import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface TeamMember {
  fullname: string | null
  email: string
  status: string
  userId: number
  teamId: number
  role: string
}

export async function GET(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.userId

  const { searchParams } = new URL(req.url)
  const teamId = parseInt(searchParams.get('teamId') ?? '0')

  try {
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
      return NextResponse.json({
        success: false,
        message: 'Team not found.',
      })
    }

    const members = {
      is_group_admin: false,
      is_invited: false,
      is_requested: false,
      team_members: [] as TeamMember[],
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
      members,
    })
  } catch (error) {
    logger.error(`Failed to get team members, ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
