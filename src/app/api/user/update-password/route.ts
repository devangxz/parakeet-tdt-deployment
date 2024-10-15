import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  const { payload } = await req.json()
  logger.info('--> updatePassword')
  try {
    const { password, newPassword } = payload
    if (password === newPassword)
      return NextResponse.json({
        message: 'SCB_UPDATE_PASSWORD_SAME',
        statusCode: 400,
      })
    if (!password)
      return NextResponse.json({
        message: 'SCB_UPDATE_PASSWORD_EMPTY',
        statusCode: 400,
      })

    const userDetails = await prisma.user.findUnique({
      where: { id: user?.userId },
    })
    const comparePasswords = await bcrypt.compare(
      password,
      userDetails?.pass as string
    )
    if (!comparePasswords)
      return NextResponse.json({
        message: 'SCB_UPDATE_PASSWORD_MISMATCH',
        statusCode: 400,
      })
    else {
      const salt = bcrypt.genSaltSync(10)
      const hashedPassword = bcrypt.hashSync(newPassword, salt)
      await prisma.user.update({
        where: { id: user?.userId },
        data: { pass: hashedPassword, salt },
      })
      return NextResponse.json({
        message: 'SCB_UPDATE_PASSWORD_SUCCESS',
        statusCode: 200,
      })
    }
  } catch (err) {
    logger.error(`Error Updating Password: ${err}`)
    return NextResponse.json({
      message: 'SCB_UPDATE_PASSWORD_FAILED',
      statusCode: 500,
    })
  }
}
