import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: { resetPasswordToken: string } }
) {
  const resetPasswordToken = params.resetPasswordToken
  const { password } = await req.json()

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
      return NextResponse.json(
        { success: false, message: 'Invalid or expired reset token' },
        { status: 400 }
      )
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

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error) {
    logger.error('Error during password reset', error)
    return NextResponse.json(
      { success: false, message: 'Error during password reset' },
      { status: 500 }
    )
  }
}
