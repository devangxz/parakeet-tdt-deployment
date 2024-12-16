'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateSource(verifyToken: string, source: string) {
  try {
    const inviteExists = await prisma.invite.findUnique({
      where: {
        inviteKey: verifyToken,
      },
    })

    if (!inviteExists) {
      return {
        success: false,
        message: 'Invalid invite key',
      }
    }

    const user = await prisma.user.findUnique({
      where: {
        email: inviteExists.email,
      },
    })

    if (!user) {
      return { success: false, message: 'User not found' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        source,
      },
    })

    return {
      success: true,
      message: 'Update source successfully',
    }
  } catch (error) {
    logger.error('Error during source update', error)
    return {
      success: false,
      message: 'Error during source update',
    }
  }
}
