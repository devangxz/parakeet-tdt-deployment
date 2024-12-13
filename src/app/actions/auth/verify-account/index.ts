'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function verifyAccount(verifyToken: string) {
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

    if (inviteExists.accepted) {
      return {
        success: true,
        message: 'Account verified successfully',
      }
    }

    const user = await prisma.user.findUnique({
      where: {
        email: inviteExists.email,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'VERIFIED',
      },
    })

    await prisma.invite.update({
      where: { inviteKey: verifyToken },
      data: {
        accepted: true,
      },
    })

    return {
      success: true,
      message: 'Account verified successfully',
    }
  } catch (error) {
    logger.error('Error during account verification', error)
    return {
      success: false,
      message: 'Error during account verification',
    }
  }
}
