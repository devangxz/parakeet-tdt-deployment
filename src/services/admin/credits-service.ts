import { Role, InvoiceType, InvoiceStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'
import {
  generateInvoiceId,
  generateUniqueTransactionId,
} from '@/utils/backend-helper'
import isValidEmail from '@/utils/isValidEmail'

interface AddFreeCreditsParams {
  amount: string | number
  userEmail: string
}

export async function addFreeCredits({
  amount,
  userEmail,
}: AddFreeCreditsParams) {
  const amountToAdd = parseFloat(amount as string)

  const session = await getServerSession(authOptions)
  const userDetails = session?.user

  if (!isValidEmail(userEmail)) {
    logger.error(`Invalid email: ${userEmail}`)
    return { success: false, s: 'Invalid email' }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: userEmail.toLowerCase(),
      role: {
        in: [Role.CUSTOMER, Role.ADMIN, Role.SUPERADMIN],
      },
    },
  })

  if (!user) {
    logger.error(`User not found with email ${userEmail}`)
    return { success: false, s: 'User not found' }
  }

  if (amountToAdd <= 0) {
    logger.error(`Invalid amount: ${amountToAdd}`)
    return { success: false, s: 'Invalid amountToAdd' }
  }

  try {
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
        paidBy: userDetails?.userId ?? null,
      },
    })

    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `Free Credits Added`,
      `${userDetails?.email} has added $${amountToAdd} free credits to ${userEmail}`,
      'software'
    )

    logger.info(
      `free credits added successfully for user ${user.email}, by ${userDetails?.email}`
    )
    return {
      success: true,
      s: `Free credits of $${amount} added successfully`,
    }
  } catch (error) {
    logger.error('Error adding free credits:', error)
    return { success: false, s: 'Failed to add free credits' }
  }
}
