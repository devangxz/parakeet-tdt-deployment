'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { generateUniqueId } from '@/utils/generateUniqueId'

interface UpdateSecondaryEmailPayload {
  secondaryEmail: string
  defaultEmail: boolean
}

export async function updateSecondaryEmail(
  payload: UpdateSecondaryEmailPayload
) {
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

    logger.info('--> updateSecondaryEmail')

    const userUpdate = await prisma.user.update({
      where: { id: userId },
      data: {
        secondaryEmail: payload.secondaryEmail,
      },
    })

    if (!userUpdate) {
      logger.warn('User not found')
      return {
        success: false,
        message: 'SCB_UPDATE_SECONDARY_EMAIL_USER_NOT_FOUND',
      }
    }

    const verificationKey = generateUniqueId()
    await prisma.invite.create({
      data: {
        email: payload.secondaryEmail,
        inviteKey: verificationKey,
      },
    })

    const emailData = {
      userEmailId: payload.secondaryEmail,
    }
    const templateData = {
      verificationKey: verificationKey,
    }

    const ses = getAWSSesInstance()
    await ses.sendMail('VERIFY_SECONDARY_EMAIL', emailData, templateData)

    const messageKey = payload.defaultEmail
      ? 'SCB_UPDATE_SECONDARY_EMAIL_SIGNIN_SUCCESS'
      : 'SCB_UPDATE_SECONDARY_EMAIL_SUCCESS'

    logger.info('<--updateSecondaryEmail')

    return {
      success: true,
      message: messageKey,
    }
  } catch (err) {
    logger.error(`Error updating secondary email: ${err}`)
    return {
      success: false,
      message: 'SCB_UPDATE_SECONDARY_EMAIL_FAILED',
    }
  }
}
