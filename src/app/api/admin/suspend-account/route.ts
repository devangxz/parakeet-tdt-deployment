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

    if (flag) {
      await prisma.user.update({
        where: {
          email: userEmail,
        },
        data: {
          status: 'SUSPENDED',
        },
      })
    } else {
      await prisma.user.update({
        where: {
          email: userEmail,
        },
        data: {
          status: 'VERIFIED',
        },
      })
    }

    logger.info(
      `successfully ${flag ? 'suspended' : 'reinstated'} account of ${
        user.email
      }`
    )

    return NextResponse.json({
      success: true,
      message: `Successfully ${flag ? 'suspended' : 'reinstated'} account`,
    })
  } catch (error) {
    logger.error(`Error suspending account`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
