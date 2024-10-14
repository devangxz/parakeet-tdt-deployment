import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

export async function POST(req: Request) {
  const { userEmail, flag } = await req.json()
  try {
    if (!isValidEmail(userEmail)) {
      logger.error(`Invalid email: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'Invalid email' })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User not found' })
    }

    if (user.role !== Role.QC && user.role !== Role.REVIEWER) {
      logger.error(`User is not a QC: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User is not a QC' })
    }

    await prisma.verifier.upsert({
      where: { userId: user.id },
      update: { cfBonusEnabled: flag },
      create: {
        userId: user.id,
        cfBonusEnabled: flag,
      },
    })

    logger.info(
      `successfully ${
        flag ? 'enabled' : 'disabled'
      } custom formatting bonus for ${user.email}`
    )

    return NextResponse.json({
      success: true,
      s: `Successfully ${
        flag ? 'enabled' : 'disabled'
      } custom formatting bonus`,
    })
  } catch (error) {
    logger.error(`Error enabling custom formatting bonus`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
