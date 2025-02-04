'use server'

import { TeamMemberRole, TeamMemberStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

function generateRandomString(length: number) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function addTeamMember(
  memberEmail: string,
  memberRole: string,
  teamId: number
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId
    const userEmail = user?.email

    if (!userId || !userEmail || !memberEmail || !memberRole || !teamId) {
      return {
        success: false,
        message: 'Missing required fields',
      }
    }

    if (memberEmail === userEmail) {
      logger.error(`attempt to add self to team ${memberEmail}`)
      return {
        success: false,
        message:
          'The team member email cannot be the same as your email address',
      }
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId:
            (
              await prisma.user.findUnique({ where: { email: memberEmail } })
            )?.id || -1,
          teamId: teamId,
        },
      },
    })

    if (existingMember) {
      logger.error(`User is already a member of this team ${teamId}`)
      return {
        success: false,
        message: 'User is already a member of this team',
      }
    }

    let memberUser = await prisma.user.findUnique({
      where: { email: memberEmail },
    })

    const teamEmailDetails = await getTeamSuperAdminEmailAndTeamName(teamId)

    if (!teamEmailDetails) {
      logger.error(`Team email details not found for team ${teamId}`)
      return {
        success: false,
        message: 'Team email details not found',
      }
    }

    const ses = getAWSSesInstance()

    if (!memberUser) {
      // Create a new user with a random password
      memberUser = await prisma.user.create({
        data: {
          email: memberEmail.toLowerCase(),
          user: memberEmail,
        },
      })

      const key = generateRandomString(16)

      await prisma.invite.create({
        data: {
          email: memberEmail,
          inviteKey: key,
          accepted: false,
        },
      })

      const emailData = {
        userEmailId: memberEmail || '',
      }

      const templateData = {
        user_fullname: teamEmailDetails?.superAdminFullName,
        team_name: teamEmailDetails?.teamName,
        key,
        user_firstname: teamEmailDetails?.superAdminFirstName ?? '',
      }

      await ses.sendMail(
        'TEAM_NEW_USER_ACCOUNT_CREATE',
        emailData,
        templateData
      )
    } else {
      const emailData = {
        userEmailId: memberUser.email,
      }

      const templateData = {
        user_fullname: teamEmailDetails?.superAdminFullName,
        team_name: teamEmailDetails?.teamName,
      }

      await ses.sendMail(
        'TEAM_EXISTING_USER_ACCOUNT_INVITE',
        emailData,
        templateData
      )
    }

    await prisma.teamMember.create({
      data: {
        teamId,
        userId: memberUser.id,
        role: memberRole as TeamMemberRole,
        status: TeamMemberStatus.INVITED,
      },
    })

    logger.info(
      `Successfully added ${memberUser.id} to team ${teamId} by ${userId}`
    )

    return {
      success: true,
      message: 'Team invitation sent successfully',
    }
  } catch (error) {
    logger.error(`Failed to add user to the team, ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
