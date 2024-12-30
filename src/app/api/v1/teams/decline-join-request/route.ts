import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const { teamId } = await req.json()

    if (!teamId || !userId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
    })

    if (!teamMember) {
      return NextResponse.json({ message: 'Team invite declined successfully' })
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
      return NextResponse.json(
        { message: 'Team email details not found' },
        { status: 404 }
      )
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

    logger.info(`Successfully declined team invite for user ${userId}`)

    return NextResponse.json({ message: 'Team invite declined successfully' })
  } catch (error) {
    logger.error(`Failed to decline team invite, ${error}`)
    return NextResponse.json(
      { message: 'An error occurred. Please try again after some time.' },
      { status: 500 }
    )
  }
}
