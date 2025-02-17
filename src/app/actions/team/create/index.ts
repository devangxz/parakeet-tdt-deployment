'use server'

import { Role } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

function generateRandomString(length: number) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export async function createTeam(name: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'Unauthorized',
      }
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
      return {
        success: false,
        message:
          'Team with same name already present. Please choose another name.',
      }
    }

    await prisma.$transaction(async (prisma) => {
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
    return {
      success: true,
      message: `Successfully created team ${teamName}`,
    }
  } catch (error) {
    logger.error(`Failed to create team, ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
