'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getTeams() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

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

    return {
      success: true,
      teams,
      invitations: teamInvitationWithAdminDetails,
    }
  } catch (error) {
    logger.error(`Failed to get teams, ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
