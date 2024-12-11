import { Role, InvoiceType, InvoiceStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
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
    return {
      success: false,
      s: 'Free credits has already been added for this customer',
    }
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
      },
    })

    logger.info(
      `free credits added successfully for user ${user.email}, by ${user?.user}`
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
