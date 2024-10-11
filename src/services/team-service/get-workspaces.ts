import { TeamMemberRole } from '@prisma/client'

import prisma from '@/lib/prisma'

export const getWorkspaces = async (userId: number) => {
  try {
    const userTeams = await prisma.teamMember.findMany({
      where: {
        userId: userId,
      },
      include: {
        team: true,
      },
    })

    const teamsWithAdmin = await Promise.all(
      userTeams.map(async (teamMember) => {
        const internalAdmin = await prisma.teamMember.findFirst({
          where: {
            teamId: teamMember.teamId,
            role: TeamMemberRole.INTERNAL_TEAM_USER,
          },
        })

        return {
          teamName: teamMember.team.name,
          userRole: teamMember.role,
          internalAdminUserId: internalAdmin ? internalAdmin.userId : null,
        }
      })
    )

    return { success: true, data: teamsWithAdmin }
  } catch (error) {
    console.error(error)
    return {
      success: false,
      message: 'An error occurred. Please try after some time.',
    }
  }
}
