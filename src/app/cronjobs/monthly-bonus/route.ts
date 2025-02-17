import { BonusType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

const addBonus = async (userId: number, amount: number) => {
  const result = await prisma.bonus.create({
    data: {
      userId: userId,
      amount: amount,
      type: BonusType.MONTHLY,
    },
  })
  return result
}

export async function POST() {
  try {
    const transcribers = await prisma.verifier.findMany({
      where: {
        monthlyBonusEnabled: true,
      },
      select: {
        userId: true,
        User: true,
      },
    })

    for (const transcriber of transcribers) {
      logger.info(`Sending monthly bonus for ${transcriber.User.email}`)

      const amount = 10
      await addBonus(transcriber.userId, amount)

      logger.info(
        `Successfully sent monthly bonus for ${transcriber.User.email}`
      )
    }

    return NextResponse.json({ message: `Successfully sent monthly bonus` })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      {
        error: 'An error occurred while sending monthly bonus',
      },
      { status: 500 }
    )
  }
}
