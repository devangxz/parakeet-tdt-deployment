'use server'

import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

interface User {
  id: number
  firstname: string | null
  lastname: string | null
  email: string
  role: Role
  createdAt: Date
}

interface TestUser extends User {
  invitationId: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export async function getUsersWithoutTests(): Promise<ApiResponse<User[]>> {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.TRANSCRIBER, Role.REVIEWER, Role.PROOFREADER_LEGACY],
        },
        TestAttempts: {
          none: {},
        },
        TestInvitations: {
          none: {},
        },
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    return {
      success: true,
      data: users,
    }
  } catch (error) {
    logger.error(`Error fetching users without tests: ${error}`)
    return {
      success: false,
      error: 'Failed to fetch users without tests',
    }
  }
}

export async function getActiveTestUsers(): Promise<ApiResponse<TestUser[]>> {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.TRANSCRIBER, Role.REVIEWER, Role.PROOFREADER_LEGACY],
        },
        TestInvitations: {
          some: {},
        },
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        email: true,
        role: true,
        createdAt: true,
        TestInvitations: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    return {
      success: true,
      data: users.map((user) => ({
        ...user,
        invitationId: user.TestInvitations[0]?.id ?? 0,
      })),
    }
  } catch (error) {
    logger.error(`Error fetching active test users: ${error}`)
    return {
      success: false,
      error: 'Failed to fetch active test users',
    }
  }
}

export async function inviteUsers(
  userIds: number[],
  adminId: number
): Promise<ApiResponse<{ count: number }>> {
  try {
    const invitations = await prisma.$transaction(
      userIds.map((userId) =>
        prisma.testInvitation.create({
          data: {
            userId,
            invitedBy: adminId,
          },
        })
      )
    )

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        firstname: true,
        lastname: true,
        email: true,
        role: true,
      },
    })

    const ses = getAWSSesInstance()

    await Promise.all(
      users.map((user) =>
        ses.sendMail(
          'TEST_INVITATION',
          { userEmailId: user.email },
          {
            first_name: user.firstname || 'there',
            role: user.role.toLowerCase(),
            test_url: `https://scribie.ai/transcribe/transcriber`,
          }
        )
      )
    )

    return {
      success: true,
      data: {
        count: invitations.length,
      },
    }
  } catch (error) {
    logger.error(`Error inviting users: ${error}`)
    return {
      success: false,
      error: 'Failed to invite users',
    }
  }
}

export async function removeTestInvitations(
  userIds: number[]
): Promise<ApiResponse<{ count: number }>> {
  try {
    const result = await prisma.testInvitation.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    })

    return {
      success: true,
      data: {
        count: result.count,
      },
    }
  } catch (error) {
    logger.error(`Error removing test invitations: ${error}`)
    return {
      success: false,
      error: 'Failed to remove test invitations',
    }
  }
}
