import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getCreditsBalance } from '@/utils/backend-helper'

export async function POST(req: Request) {
  try {
    const { invd, em } = await req.json()

    const toUser = await prisma.user.findFirst({
      where: {
        email: em,
        OR: [{ role: Role.CUSTOMER }, { role: Role.ADMIN }],
      },
    })

    if (!toUser) {
      logger.error(`'${em}' user was not found`)
      return NextResponse.json({
        success: false,
        message: `'${em}' user was not found`,
      })
    }
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: invd },
      include: { user: true },
    })

    if (!invoice) {
      logger.error(`Invoice with id ${invd} not found`)
      return NextResponse.json({ success: false, message: 'Invoice not found' })
    }

    const fromUserId = invoice.userId
    const transferAmount = invoice.amount
    const fromUserCreditsBalance = await getCreditsBalance(fromUserId)

    if (fromUserCreditsBalance < transferAmount) {
      logger.error(`Insufficient credits for user ${fromUserId}`)
      return NextResponse.json({
        success: false,
        message: 'Insufficient credits',
      })
    }

    await prisma.invoice.update({
      where: { invoiceId: invd },
      data: { userId: toUser.id },
    })

    logger.info(`Credits transferred from ${fromUserId} to ${toUser.id}`)
    return NextResponse.json({ success: true, message: 'Credits transferred' })
  } catch (error) {
    logger.error(`Internal server error: ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    })
  }
}
