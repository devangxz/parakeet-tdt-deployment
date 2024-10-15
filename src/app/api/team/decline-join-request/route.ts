import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.userId

  const body = await req.json()
  const { teamId } = body

  if (!teamId || !userId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
    })

    if (!teamMember) {
      return NextResponse.json({
        success: true,
        s: 'Team invite declined successfully',
      })
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
      return NextResponse.json({ error: 'Team email details not found' })
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

    return NextResponse.json({
      success: true,
      s: 'Team invite declined successfully',
    })
  } catch (error) {
    logger.error(error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try after some time.',
    })
  }
}
