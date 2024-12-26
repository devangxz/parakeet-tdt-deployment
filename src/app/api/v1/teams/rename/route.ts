import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.userId

    const { teamId, newTeamName } = await req.json()

    if (!teamId || !newTeamName) {
      logger.error(`Missing required fields, ${userId}`)
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
        },
        { status: 400 }
      )
    }

    const existingTeam = await prisma.team.findFirst({
      where: {
        name: newTeamName,
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

    await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        name: newTeamName,
      },
    })

    logger.info(`Successfully rename team to ${newTeamName} for ${userId}`)

    return NextResponse.json(`Successfully changed team name to ${newTeamName}`)
  } catch (error) {
    logger.error(`Failed to rename team, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
