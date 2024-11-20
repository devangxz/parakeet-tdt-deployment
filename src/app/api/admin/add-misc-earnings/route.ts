import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { transcriberEmail, amount, reason } = await req.json()

    const transcriberInfo = await prisma.user.findUnique({
      where: { email: transcriberEmail.toLowerCase() },
    })

    if (!transcriberInfo) {
      logger.error(`Transcriber not found ${transcriberInfo}`)
      return NextResponse.json({ s: 'User not found' })
    }

    await prisma.miscEarnings.create({
      data: {
        userId: transcriberInfo.id,
        amount: Number(amount),
        reason,
      },
    })

    logger.info(`Successfully added misc earnings to ${transcriberEmail}`)
    return NextResponse.json({
      success: true,
      s: 'Successfully added misc earnings',
    })
  } catch (error) {
    logger.error(`Failed to add misc earnings`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
