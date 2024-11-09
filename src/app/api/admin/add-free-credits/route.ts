import { Role, InvoiceType, InvoiceStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  generateInvoiceId,
  generateUniqueTransactionId,
} from '@/utils/backend-helper'
import isValidEmail from '@/utils/isValidEmail'

export async function POST(req: Request) {
  const { amount, userEmail } = await req.json()
  const amountToAdd = parseFloat(amount)
  try {
    if (!isValidEmail(userEmail)) {
      logger.error(`Invalid email: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'Invalid email' })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
        role: {
          in: [Role.CUSTOMER, Role.ADMIN, Role.SUPERADMIN],
        },
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User not found' })
    }

    if (amountToAdd <= 0) {
      logger.error(`Invalid amount: ${amountToAdd}`)
      return NextResponse.json({ success: false, s: 'Invalid amountToAdd' })
    }

    const result = await prisma.invoice.aggregate({
      where: {
        userId: user.id,
        type: 'FREE_CREDITS',
      },
      _sum: {
        amount: true,
      },
    })

    const freeCreditsGiven = result._sum.amount || 0

    if (freeCreditsGiven > 0) {
      logger.error(
        `Free credits has already been added for this customer: ${userEmail} ${freeCreditsGiven}`
      )
      return NextResponse.json({
        success: false,
        s: 'Free credits has already been added for this customer',
      })
    }

    const invoiceId = generateInvoiceId('CGFC')
    const transactionId = generateUniqueTransactionId()

    await prisma.invoice.create({
      data: {
        invoiceId,
        userId: user.id,
        type: InvoiceType.FREE_CREDITS,
        amount: amountToAdd,
        status: InvoiceStatus.PAID,
        transactionId,
      },
    })

    logger.info(
      `free credits added successfully for user ${user.email}, by ${user?.user}`
    )
    return NextResponse.json({
      success: true,
      s: `Free credits of $${amount} added successfully`,
    })
  } catch (error) {
    logger.error(`Error while adding free credits`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
