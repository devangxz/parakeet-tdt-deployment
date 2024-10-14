import { TeamMemberStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

const generateRandomString = (length: number) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function POST(req: Request) {
  const body = await req.json()
  const { memberEmail, memberRole, teamId } = body
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user.id
  const userEmail = user.email
  const ses = getAWSSesInstance()

  try {
    if (memberEmail === userEmail) {
      logger.error(`attempt to add self to team ${memberEmail}`)
      return NextResponse.json({
        success: false,
        error: 'The team member email cannot be the same as your email address',
      })
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
        {
          error: 'User is already a member of this team',
        },
        { status: 400 }
      )
    }

    let user = await prisma.user.findUnique({
      where: { email: memberEmail },
    })

    const teamEmailDetails = await getTeamSuperAdminEmailAndTeamName(teamId)

    if (!teamEmailDetails) {
      logger.error(`Team email details not found for team ${teamId}`)
      return NextResponse.json(
        { error: 'Team email details not found' },
        { status: 404 }
      )
    }

    if (!user) {
      // Create a new user with a random password
      user = await prisma.user.create({
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
        userEmailId: user.email,
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
        userId: user.id,
        role: memberRole,
        status: TeamMemberStatus.INVITED,
      },
    })

    logger.info(`Successfully added ${user.id} to team ${teamId} by ${userId}}`)

    return NextResponse.json({
      success: true,
      message: `Team invitation sent successfully`,
    })
  } catch (error) {
    logger.error(`Failed to add user to the team, ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
