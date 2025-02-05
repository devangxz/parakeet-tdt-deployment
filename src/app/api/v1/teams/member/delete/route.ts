import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getTeamSuperAdminEmailAndTeamName } from '@/utils/backend-helper'

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const { memberId, teamId } = await req.json()

    if (!memberId || !teamId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: Number(memberId),
          teamId: Number(teamId),
        },
      },
    })

    if (!existingMember) {
      logger.error(`User not found in the team ${teamId}`)
      return NextResponse.json(
        { message: 'User not found in the team' },
        { status: 404 }
      )
    }

    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId: Number(memberId),
          teamId: Number(teamId),
        },
      },
    })

    const memberUser = await prisma.user.findUnique({
      where: { id: Number(memberId) },
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

    return NextResponse.json({
      message: 'Successfully removed user from the team',
    })
  } catch (error) {
    logger.error(`Failed to remove user from team, ${error}`)
    return NextResponse.json(
      { message: 'An error occurred. Please try again after some time.' },
      { status: 500 }
    )
  }
}
