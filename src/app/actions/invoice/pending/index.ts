'use server'

import { InvoiceType, InvoiceStatus, OrderStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getPendingInvoices() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    const invoices = await prisma.invoice.findMany({
      where: {
        userId: userId,
        type: {
          notIn: [InvoiceType.TRANSCRIPT, InvoiceType.FORMATTING],
        },
        status: InvoiceStatus.PENDING,
      },
      orderBy: {
        ts: 'desc',
      },
      include: {
        user: true,
      },
    })

    const payments = []

    for (const invoice of invoices) {
      if (
        invoice.type === InvoiceType.ADDL_PROOFREADING &&
        invoice.itemNumber
      ) {
        const fileIds = invoice.itemNumber.split(',')

        const orders = await prisma.order.findMany({
          where: {
            fileId: {
              in: fileIds,
            },
          },
        })

        if (orders.some((order) => order.status !== OrderStatus.BLOCKED)) {
          continue
        }
      }
      payments.push({
        u: invoice.user.firstname
          ? `${invoice.user.firstname} ${invoice.user.lastname} (${invoice.user.email})`
          : invoice.user.email,

        fullname: `${invoice.user.firstname} ${invoice.user.lastname}`,
        email: invoice.user.email,
        id: invoice.invoiceId,
        amt: Math.round((invoice.amount - invoice.discount) * 100) / 100,
        ts: invoice.createdAt,
        t: invoice.type,
      })
    }

    logger.info(`sent ${payments.length} pending invoices for user ${userId}`)
    return {
      success: true,
      data: payments,
    }
  } catch (error) {
    logger.error(`failed to get pending invoices: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
