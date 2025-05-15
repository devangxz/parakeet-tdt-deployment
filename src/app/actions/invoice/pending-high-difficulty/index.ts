'use server'

import { InvoiceType, InvoiceStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getPendingHighDifficultyCount() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
        count: 0,
      }
    }

    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        userId: userId,
        type: InvoiceType.ADDL_PROOFREADING,
        status: InvoiceStatus.PENDING,
      },
      include: {
        user: true,
      },
    })

    // Count invoices that have files with BLOCKED status
    let validPendingInvoicesCount = 0

    for (const invoice of pendingInvoices) {
      if (invoice.itemNumber) {
        const fileIds = invoice.itemNumber.split(',')

        const orders = await prisma.order.findMany({
          where: {
            fileId: {
              in: fileIds,
            },
          },
        })

        // Only count if at least one order is in BLOCKED status
        if (orders.some((order) => order.status === 'BLOCKED')) {
          validPendingInvoicesCount++
        }
      }
    }

    logger.info(
      `Found ${validPendingInvoicesCount} pending high difficulty invoices for user ${userId}`
    )

    return {
      success: true,
      count: validPendingInvoicesCount,
    }
  } catch (error) {
    logger.error(`Failed to get pending high difficulty count: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
      count: 0,
    }
  }
}
