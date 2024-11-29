import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  const { secondaryEmail, defaultEmail } = await req.json()

  logger.info('--> updateSecondaryEmail')
  try {
    const data = {
      secondaryEmail,
    }
    const userUpdate = await prisma.user.update({
      where: { id: user?.userId },
      data: data,
    })
    if (!userUpdate) {
      logger.warn('User not found')
      return NextResponse.json({
        message: 'SCB_UPDATE_SECONDARY_EMAIL_USER_NOT_FOUND',
        statusCode: 404,
      })
      return
    }
    const verificationKey = generateUniqueId()
    await prisma.invite.create({
      data: {
        email: secondaryEmail,
        inviteKey: verificationKey,
      },
    })
    const emailData = {
      userEmailId: secondaryEmail,
    }
    const templateData = {
      verificationKey: verificationKey,
    }
    const ses = getAWSSesInstance()
    await ses.sendMail('VERIFY_SECONDARY_EMAIL', emailData, templateData)
    const messageKey = defaultEmail
      ? 'SCB_UPDATE_SECONDARY_EMAIL_SIGNIN_SUCCESS'
      : 'SCB_UPDATE_SECONDARY_EMAIL_SUCCESS'
    return NextResponse.json({ message: messageKey, statusCode: 200 })
    logger.info('<--updateSecondaryEmail')
  } catch (err) {
    logger.error(`Error updating secondary email: ${err}`)
    return NextResponse.json({
      message: 'SCB_UPDATE_SECONDARY_EMAIL_FAILED',
      statusCode: 500,
    })
  }
}
