'use server'

import { TeamMemberRole } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateTeamMemberRole(
  memberEmail: string,
  teamId: number,
  memberRole: string
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!memberEmail || !teamId || !memberRole) {
      return {
        success: false,
        message: 'Missing required fields',
      }
    }

    const memberUser = await prisma.user.findUnique({
      where: { email: memberEmail },
    })

    if (!memberUser) {
      logger.error(`User not found for team ${teamId}`)
      return {
        success: false,
        message: 'User not found',
      }
    }

    await prisma.teamMember.updateMany({
      where: {
        userId: memberUser.id,
        teamId,
      },
      data: {
        role: memberRole as TeamMemberRole,
      },
    })

    logger.info(
      `Successfully changed user ${memberEmail} role to ${memberRole} for team ${teamId} by ${userId}`
    )

    return {
      success: true,
      message: 'Successfully changed user role',
    }
  } catch (error) {
    logger.error(`Failed to change user role, ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
