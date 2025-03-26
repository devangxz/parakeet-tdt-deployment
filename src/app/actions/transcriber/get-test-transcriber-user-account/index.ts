'use server'

import { TRANSCRIBER_TEST_USER } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface TestUserResponse {
  success: boolean
  userId: number | null
}

export async function getTestTranscriberUserAccount(): Promise<TestUserResponse> {
  try {
    const testUser = await prisma.user.findUnique({
      where: {
        email: TRANSCRIBER_TEST_USER,
      },
      select: {
        id: true,
      },
    })

    if (!testUser) {
      logger.error(
        `Test transcriber user account not found: ${TRANSCRIBER_TEST_USER}`
      )
      return {
        success: false,
        userId: null,
      }
    }

    return {
      success: true,
      userId: testUser.id,
    }
  } catch (error) {
    logger.error(`Error fetching test transcriber user account: ${error}`)
    return {
      success: false,
      userId: null,
    }
  }
}
