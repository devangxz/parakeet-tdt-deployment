'use server'

import bcrypt from 'bcryptjs'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function resetPassword(
  resetPasswordToken: string,
  password: string
) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordTokenExpires: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'Invalid or expired reset token',
      }
    }

    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(password, salt)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        pass: hash,
        salt: salt,
        resetPasswordToken: null,
        resetPasswordTokenExpires: null,
      },
    })

    return {
      success: true,
      message: 'Password has been reset successfully',
    }
  } catch (error) {
    logger.error('Error during password reset', error)
    return {
      success: false,
      message: 'Error during password reset',
    }
  }
}
