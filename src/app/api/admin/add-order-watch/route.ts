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
        email: userEmail.toLowerCase(),
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User not found' })
    }

    if (user.role !== Role.CUSTOMER) {
      logger.error(`User is not a customer: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User is not a customer' })
    }

    await prisma.customer.upsert({
      where: { userId: user.id },
      update: { watch: flag },
      create: {
        userId: user.id,
        watch: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'added' : 'removed'} customer to order watch for ${
        user.email
      }`
    )

    return NextResponse.json({
      success: true,
      s: `Customer ${flag ? 'added' : 'removed'} to order watch successfully`,
    })
  } catch (error) {
    logger.error(`Error adding customer to order watch`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
