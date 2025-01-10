import { TeamMemberRole, TeamMemberStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
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

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId
    const userEmail = user.email

    const { memberEmail, memberRole, teamId: teamIdString } = await req.json()

    if (!userId || !userEmail || !memberEmail || !memberRole || !teamIdString) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const teamId = Number(teamIdString)

    if (memberEmail === userEmail) {
      logger.error(`attempt to add self to team ${memberEmail}`)
      return NextResponse.json(
        {
          message:
            'The team member email cannot be the same as your email address',
        },
        { status: 400 }
      )
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
      return NextResponse.json(
        { message: 'User is already a member of this team' },
        { status: 409 }
      )
    }

    let memberUser = await prisma.user.findUnique({
      where: { email: memberEmail },
    })

    const teamEmailDetails = await getTeamSuperAdminEmailAndTeamName(teamId)

    if (!teamEmailDetails) {
      logger.error(`Team email details not found for team ${teamId}`)
      return NextResponse.json(
        { message: 'Team email details not found' },
        { status: 404 }
      )
    }

    const ses = getAWSSesInstance()

    if (!memberUser) {
      // Create a new user with a random password
      memberUser = await prisma.user.create({
        data: {
          email: memberEmail,
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

    return NextResponse.json({ message: 'Team invitation sent successfully' })
  } catch (error) {
    logger.error(`Failed to add user to the team, ${error}`)
    return NextResponse.json(
      { message: 'An error occurred. Please try again after some time.' },
      { status: 500 }
    )
  }
}
