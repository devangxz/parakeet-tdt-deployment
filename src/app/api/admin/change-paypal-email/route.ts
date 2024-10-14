import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

export async function POST(req: Request) {
  const { userEmail, newEmail } = await req.json()
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

    await prisma.user.update({
      where: {
        email: userEmail,
      },
      data: {
        paypalId: newEmail,
      },
    })

    logger.info(
      `successfully changed paypal email of ${user.email} to ${newEmail}`
    )

    return NextResponse.json({
      success: true,
      s: `Successfully changed paypal email`,
    })
  } catch (error) {
    logger.error(`Error changing paypal email`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
