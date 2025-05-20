'use server'

import { randomBytes } from 'crypto'

import { addHours } from 'date-fns'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function forgotPassword(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      logger.error(`email does not exist ${email}`)
      return { success: true, message: 'Email sent' }
    }

    const resetToken = randomBytes(32).toString('hex')
    const expiry = addHours(new Date(), 24)

    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpires: expiry,
      },
    })

    const emailData = {
      userEmailId: email.toLowerCase(),
    }

    const templateData = {
      href: `https://${process.env.SERVER}/reset-password/${resetToken}`,
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('RESET_PASSWORD', emailData, templateData)

    return {
      success: true,
      message: 'Check email for further instructions',
    }
  } catch (error) {
    logger.error('Error during forgot password', error)
    return {
      success: false,
      message: 'Error during forgot password',
    }
  }
}
