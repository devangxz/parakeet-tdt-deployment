import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const body = await req.json()
  const { memberId, teamId } = body
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.userId

  if (!memberId || !teamId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing required fields',
      },
      { status: 400 }
    )
  }

  try {
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
      return NextResponse.json(
        { error: 'User not found in the team' },
        { status: 404 }
      )
    }

    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId: memberId,
          teamId,
        },
      },
    })

    const user = await prisma.user.findUnique({
      where: { id: memberId },
    })

    const teamEmailDetails = await getTeamSuperAdminEmailAndTeamName(teamId)

    if (!teamEmailDetails) {
      logger.error(`Team email details not found for team ${teamId}`)
      return NextResponse.json(
        { error: 'Team email details not found' },
        { status: 404 }
      )
    }

    const emailData = {
      userEmailId: user?.email || '',
    }

    const templateData = {
      super_admin_name: teamEmailDetails?.superAdminFirstName || '',
      super_admin_email: teamEmailDetails?.superAdminEmail || '',
      team_name: teamEmailDetails.teamName || '',
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('TEAM_MEMBER_REMOVE', emailData, templateData)

    logger.info(
      `Successfully removed user ${memberId} from team ${teamId} by ${userId}}`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully removed user from the team`,
    })
  } catch (error) {
    logger.error(`Failed to remove user from team, ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
