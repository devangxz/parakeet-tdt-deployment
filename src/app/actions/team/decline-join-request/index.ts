'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

export async function declineTeamJoinRequest(teamId: number) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!teamId || !userId) {
      return {
        success: false,
        message: 'Missing required fields',
      }
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
    })

    if (!teamMember) {
      return {
        success: true,
        s: 'Team invite declined successfully',
      }
    }

    await prisma.teamMember.deleteMany({
      where: { userId, teamId },
    })

    const member = await prisma.user.findUnique({
      where: {
        id: userId,
      },
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
      userEmailId: member?.email || '',
    }

    const templateData = {
      owner_firstname: teamEmailDetails.superAdminFirstName || '',
      member_name: member?.firstname || '',
      member_fullname: `${member?.firstname || ''} ${member?.lastname || ''}`,
      team_name: teamEmailDetails.teamName,
    }

    const ses = getAWSSesInstance()

    await ses.sendMail(
      'TEAM_EXISTING_USER_ACCOUNT_DECLINE_INVITE',
      emailData,
      templateData
    )

    return {
      success: true,
      s: 'Team invite declined successfully',
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      s: 'An error occurred. Please try after some time.',
    }
  }
}
