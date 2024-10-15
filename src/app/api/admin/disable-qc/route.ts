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

    if (user.role !== Role.QC) {
      logger.error(`User is not a QC: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User is not a QC' })
    }

    await prisma.verifier.upsert({
      where: { userId: user.id },
      update: { qcDisabled: flag },
      create: {
        userId: user.id,
        qcDisabled: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'disabled' : 'enabled'} qc for ${user.email}`
    )

    return NextResponse.json({
      success: true,
      s: `QC ${flag ? 'disabled' : 'enabled'} successfully`,
    })
  } catch (error) {
    logger.error(`Error disabling qc`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
