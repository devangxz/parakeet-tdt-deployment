'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function saveDefaultInstructions(instructions: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    logger.info('--> defaultOrderInstructions')

    await prisma.defaultInstruction.upsert({
      where: { userId },
      update: { instructions },
      create: { userId, instructions },
    })

    return {
      success: true,
      message: 'SCB_DEFAULT_ORDER_INSTRUCTIONS_SUCCESS',
    }
  } catch (err) {
    logger.error(`Error handling default order instructions: ${err}`)
    return {
      success: false,
      message: 'SCB_DEFAULT_ORDER_INSTRUCTIONS_SAVE_FAILED',
    }
  }
}
