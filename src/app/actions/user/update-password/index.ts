'use server'

import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface UpdatePasswordPayload {
  password: string
  newPassword: string
}

export async function updatePassword(payload: UpdatePasswordPayload) {
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

    logger.info('--> updatePassword')

    const { password, newPassword } = payload

    if (password === newPassword) {
      return {
        success: false,
        message: 'SCB_UPDATE_PASSWORD_SAME',
      }
    }

    if (!password) {
      return {
        success: false,
        message: 'SCB_UPDATE_PASSWORD_EMPTY',
      }
    }

    const userDetails = await prisma.user.findUnique({
      where: { id: userId },
    })

    const comparePasswords = await bcrypt.compare(
      password,
      userDetails?.pass as string
    )

    if (!comparePasswords) {
      return {
        success: false,
        message: 'SCB_UPDATE_PASSWORD_MISMATCH',
      }
    }

    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(newPassword, salt)

    await prisma.user.update({
      where: { id: userId },
      data: { pass: hashedPassword, salt },
    })

    return {
      success: true,
      message: 'SCB_UPDATE_PASSWORD_SUCCESS',
    }
  } catch (err) {
    logger.error(`Error Updating Password: ${err}`)
    return {
      success: false,
      message: 'SCB_UPDATE_PASSWORD_FAILED',
    }
  }
}
