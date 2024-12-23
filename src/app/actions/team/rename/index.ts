'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function renameTeam(teamId: number, newTeamName: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!teamId || !newTeamName || !userId) {
      return {
        success: false,
        message: 'Missing required fields',
      }
    }

    const existingTeam = await prisma.team.findFirst({
      where: {
        name: newTeamName,
        owner: userId,
      },
    })

    if (existingTeam) {
      logger.error(`Team with same name already exists, ${userId}`)
      return {
        success: false,
        message:
          'Team with same name already present. Please choose another name.',
      }
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

    return {
      success: true,
      message: `Successfully changed team name to ${newTeamName}`,
    }
  } catch (error) {
    logger.error(`Failed to rename team, ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
