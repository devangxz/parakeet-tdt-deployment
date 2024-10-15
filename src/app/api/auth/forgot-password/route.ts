import { randomBytes } from 'crypto'

import { addHours } from 'date-fns'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST(req: Request) {
  const { email } = await req.json()

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      logger.error(`email does not exist ${email}`)
      return NextResponse.json({ success: true, message: 'Email sent' })
    }

    const resetToken = randomBytes(32).toString('hex')
    const expiry = addHours(new Date(), 24)

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpires: expiry,
      },
    })

    const emailData = {
      userEmailId: email,
    }

    const templateData = {
      href: `https://${process.env.SERVER}/reset-password/${resetToken}`,
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('RESET_PASSWORD', emailData, templateData)

    return NextResponse.json({
      success: true,
      message: 'Check email for further instructions',
    })
  } catch (error) {
    logger.error('Error during forgot password', error)
    return NextResponse.json(
      { success: false, message: 'Error during forgot password' },
      { status: 500 }
    )
  }
}
