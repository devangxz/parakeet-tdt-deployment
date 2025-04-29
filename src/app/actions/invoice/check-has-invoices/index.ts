'use server'

import { InvoiceStatus, InvoiceType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function checkUserHasInvoices() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        hasInvoice: false,
        message: 'User not authenticated',
      }
    }

    const invoiceCount = await prisma.invoice.count({
      where: {
        userId,
        status: InvoiceStatus.PAID,
        type: {
          in: [InvoiceType.TRANSCRIPT, InvoiceType.ADD_CREDITS],
        },
      },
    })

    logger.info(
      `Checked invoice existence for user ${userId}: ${
        invoiceCount > 0 ? 'Has invoices' : 'No invoices'
      }`
    )

    return {
      success: true,
      hasInvoice: invoiceCount > 0,
    }
  } catch (error) {
    logger.error(`Failed to check user invoices: ${error}`)
    return {
      success: false,
      hasInvoice: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
