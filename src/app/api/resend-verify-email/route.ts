import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userEmail = user?.email
  let inviteKey = generateUniqueId()
  try {
    const inviteExists = await prisma.invite.findFirst({
      where: {
        email: userEmail,
      },
    })

    if (!inviteExists) {
      await prisma.invite.create({
        data: {
          email: userEmail,
          inviteKey,
        },
      })
      return NextResponse.json({
        success: true,
        message: 'Resend verification email successfully',
      })
    }

    inviteKey = inviteExists.inviteKey

    const emailData = {
      userEmailId: userEmail,
    }

    const templateData = {
      first_name: user?.firstname || '',
      url: `https://${process.env.SERVER}/verify-account/${inviteKey}`,
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('ACCOUNT_VERIFY', emailData, templateData)

    return NextResponse.json({
      success: true,
      message: 'Resend verification email successfully',
    })
  } catch (error) {
    logger.error('Error resending verification email', error)
    return NextResponse.json({
      success: false,
      message: 'Error resending verification email',
    })
  }
}
