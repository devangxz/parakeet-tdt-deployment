'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function resendVerificationEmail() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!user?.email) {
      return {
        success: false,
        message: 'User email not found',
      }
    }

    let inviteKey = generateUniqueId()

    const inviteExists = await prisma.invite.findFirst({
      where: {
        email: user.email,
      },
    })

    if (!inviteExists) {
      await prisma.invite.create({
        data: {
          email: user.email,
          inviteKey,
        },
      })
      return {
        success: true,
        message: 'Resend verification email successfully',
      }
    }

    inviteKey = inviteExists.inviteKey

    const emailData = {
      userEmailId: user.email,
    }

    const templateData = {
      first_name: user?.name || '',
      url: `https://${process.env.SERVER}/verify-account/${inviteKey}`,
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('ACCOUNT_VERIFY', emailData, templateData)

    return {
      success: true,
      message: 'Resend verification email successfully',
    }
  } catch (error) {
    logger.error('Error resending verification email', error)
    return {
      success: false,
      message: 'Error resending verification email',
    }
  }
}
