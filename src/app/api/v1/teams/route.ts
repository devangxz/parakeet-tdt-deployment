export const dynamic = 'force-dynamic'
import { Role } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

function generateRandomString(length: number) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user?.userId

    const { searchParams } = new URL(req.url)
    const sendInvitation = searchParams.get('sendInvitation')

    const teams = await prisma.teamMember.findMany({
      where: {
        userId: user.userId,
      },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            members: {
              where: {
                status: 'ACCEPTED',
                role: {
                  not: 'INTERNAL_TEAM_USER',
                },
              },
            },
          },
        },
      },
    })

    const invitations = await prisma.teamMember.findMany({
      where: {
        userId,
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

    logger.info(`Found ${teams.length} teams for user ${user.userId}`)

    return NextResponse.json({
      success: true,
      data: teams,
      ...(sendInvitation === 'true' && {
        invitations: teamInvitationWithAdminDetails,
      }),
    })
  } catch (error) {
    logger.error(`Failed to get teams, ${error}`)
    return NextResponse.json(
      { message: 'An error occurred. Please try again after some time.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const { name } = await req.json()
    if (!name) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const teamName = name
    const internalUserEmail =
      teamName.replace(/\s/g, '_') +
      '+' +
      generateRandomString(8) +
      '@scribie.com'

    const existingTeam = await prisma.team.findFirst({
      where: {
        name: teamName,
        owner: userId,
      },
    })

    if (existingTeam) {
      logger.error(`Team with same name already exists, ${userId}`)
      return NextResponse.json(
        {
          success: false,
          message:
            'Team with same name already present. Please choose another name.',
        },
        { status: 409 }
      )
    }

    const newTeam = await prisma.$transaction(async (prisma) => {
      const newTeam = await prisma.team.create({
        data: {
          owner: userId,
          name: teamName,
        },
      })

      // Add the user as a SUPER_ADMIN
      await prisma.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: userId,
          role: 'SUPER_ADMIN',
          status: 'ACCEPTED',
        },
      })

      const internalAdminUser = await prisma.user.create({
        data: {
          email: internalUserEmail.toLowerCase(),
          role: Role.INTERNAL_TEAM_USER,
          user: internalUserEmail,
          salt: '',
          status: 'VERIFIED',
        },
      })

      // Insert internal admin user as a team member
      await prisma.teamMember.create({
        data: {
          teamId: newTeam.id,
          userId: internalAdminUser.id,
          role: 'INTERNAL_TEAM_USER',
          status: 'ACCEPTED',
        },
      })

      return newTeam
    })

    logger.info(`Successfully created team ${teamName} for ${userId}`)
    return NextResponse.json({
      success: true,
      data: {
        id: newTeam.id,
        name: newTeam.name,
      },
    })
  } catch (error) {
    logger.error(`Failed to create team, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
