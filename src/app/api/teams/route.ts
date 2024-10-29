export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.userId
  try {
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
                role: {
                  not: 'INTERNAL_TEAM_USER',
                },
              },
            },
          },
        },
      },
    })

    const invitations = await prisma.teamMember.findMany({
      where: {
        userId,
        status: 'INVITED',
      },
      include: {
        team: {
          include: {
            members: {
              where: {
                role: 'SUPER_ADMIN',
              },
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    const teamInvitationWithAdminDetails = invitations.map((invitation) => {
      const admin = invitation.team.members[0]
      return {
        name: invitation.team.name,
        group_id: invitation.team.id,
        status: 'INVITED',
        admin_name: `${admin.user.firstname} ${admin.user.lastname}`,
        admin_email: admin.user.email,
      }
    })

    logger.info(`Found ${teams.length} teams for user ${userId}`)

    return NextResponse.json({
      success: true,
      teams,
      invitations: teamInvitationWithAdminDetails,
    })
  } catch (error) {
    logger.error(`Failed to get teams, ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
