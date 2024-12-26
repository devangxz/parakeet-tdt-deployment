import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const invitations = await prisma.teamMember.findMany({
      where: {
        userId: user.userId,
        status: 'INVITED',
      },
      include: {
        team: {
          include: {
            members: {
              where: {
                role: 'SUPER_ADMIN',
              },
              include: {
                user: true,
              },
            },
          },
        },
      },
    })

    const teamInvitationWithAdminDetails = invitations.map((invitation) => {
      const admin = invitation.team.members[0]
      return {
        name: invitation.team.name,
        group_id: invitation.team.id,
        status: 'INVITED',
        admin_name: `${admin.user.firstname} ${admin.user.lastname}`,
        admin_email: admin.user.email,
      }
    })

    logger.info(
      `Found ${invitations.length} invitations for user ${user.userId}`
    )

    return NextResponse.json({
      success: true,
      data: teamInvitationWithAdminDetails,
    })
  } catch (error) {
    logger.error(`Failed to get teams invitations, ${error}`)
    return NextResponse.json(
      { message: 'An error occurred. Please try again after some time.' },
      { status: 500 }
    )
  }
}
