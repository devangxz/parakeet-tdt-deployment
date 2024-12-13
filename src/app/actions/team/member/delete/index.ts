'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

export async function deleteTeamMember(memberId: number, teamId: number) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!memberId || !teamId) {
      return {
        success: false,
        message: 'Missing required fields',
      }
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: memberId,
          teamId,
        },
      },
    })

    if (!existingMember) {
      logger.error(`User not found in the team ${teamId}`)
      return {
        success: false,
        message: 'User not found in the team',
      }
    }

    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId: memberId,
          teamId,
        },
      },
    })

    const memberUser = await prisma.user.findUnique({
      where: { id: memberId },
    })

    const teamEmailDetails = await getTeamSuperAdminEmailAndTeamName(teamId)

    if (!teamEmailDetails) {
      logger.error(`Team email details not found for team ${teamId}`)
      return {
        success: false,
        message: 'Team email details not found',
      }
    }

    const emailData = {
      userEmailId: memberUser?.email || '',
    }

    const templateData = {
      super_admin_name: teamEmailDetails?.superAdminFirstName || '',
      super_admin_email: teamEmailDetails?.superAdminEmail || '',
      team_name: teamEmailDetails.teamName || '',
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('TEAM_MEMBER_REMOVE', emailData, templateData)

    logger.info(
      `Successfully removed user ${memberId} from team ${teamId} by ${userId}`
    )

    return {
      success: true,
      message: 'Successfully removed user from the team',
    }
  } catch (error) {
    logger.error(`Failed to remove user from team, ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
