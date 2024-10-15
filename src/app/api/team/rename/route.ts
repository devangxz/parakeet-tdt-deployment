import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.userId
  const { teamId, newTeamName } = await req.json()

  try {
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: newTeamName,
        owner: userId,
      },
    })

    if (existingTeam) {
      logger.error(`Team with same name already exists, ${userId}`)
      return NextResponse.json({
        success: false,
        message:
          'Team with same name already present. Please choose another name.',
      })
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

    return NextResponse.json({
      success: true,
      message: `Successfully changed team name to ${newTeamName}`,
    })
  } catch (error) {
    logger.error(`Failed to rename team, ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
