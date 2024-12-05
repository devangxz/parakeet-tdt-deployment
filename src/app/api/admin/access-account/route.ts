/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server'

import { signJwtAccessToken } from '@/lib/jwt'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

export async function POST(req: Request) {
  const { email: userEmail } = await req.json()
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  try {
    if (!isValidEmail(userEmail)) {
      logger.error(`Invalid email: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'Invalid email' })
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User not found' })
    }

    const { iat, exp, ...userWithoutIatExp } = user as {
      iat?: number
      exp?: number
    }

    const payload = {
      ...userWithoutIatExp,
      userId: user.id,
      user: user.user,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
      adminAccess: true,
      readonly: true,
      legalEnabled: user?.Verifier?.legalEnabled || false,
      reviewEnabled: user?.Verifier?.cfReviewEnabled || false,
      internalTeamUserId: null,
      teamName: null,
      selectedUserTeamRole: null,
    }

    const token = signJwtAccessToken(payload)

    const details = {
      token,
      role: user.role,
      userId: user.id,
      user: user.user,
      email: user.email,
      referralCode: user.referralCode,
      adminAccess: true,
      readonly: true,
      legalEnabled: user?.Verifier?.legalEnabled || false,
      reviewEnabled: user?.Verifier?.cfReviewEnabled || false,
      internalTeamUserId: null,
      teamName: null,
      selectedUserTeamRole: null,
    }

    logger.info(`switch user to ${user.user} successful, ${user.user}`)
    return NextResponse.json({ success: true, details })
  } catch (error) {
    logger.error(`Error occurred while switching user to ${userEmail}`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
