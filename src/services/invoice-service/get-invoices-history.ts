import { InvoiceType, InvoiceStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getInvoicesHistory(userId: number, onlyRefunds: boolean) {
  try {
    let refundFilter = {}

    if (onlyRefunds) {
      refundFilter = {
        OR: [
          {
            creditsRefunded: {
              gt: 0,
            },
          },
          {
            refundAmount: {
              gt: 0,
            },
          },
        ],
      }
    }
    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        type: {
          in: [
            InvoiceType.TRANSCRIPT,
            InvoiceType.ADDL_FORMATTING,
            InvoiceType.ADDL_PROOFREADING,
            InvoiceType.ADD_CREDITS,
            InvoiceType.FORMATTING,
          ],
        },
        status: {
          not: InvoiceStatus.PENDING,
        },
        ...refundFilter,
      },
      orderBy: {
        ts: 'desc',
      },
      include: {
        user: true,
      },
    })

    const payments = invoices.map((invoice) => ({
      u: invoice.user.firstname
        ? `${invoice.user.firstname} ${invoice.user.lastname} (${invoice.user.email})`
        : invoice.user.email,

      fullname: `${invoice.user.firstname} ${invoice.user.lastname}`,
      email: invoice.user.email,
      id: invoice.invoiceId,
      amt: Math.round((invoice.amount - invoice.discount) * 100) / 100,
      ts: invoice.createdAt,
      t: invoice.type,
      ra: invoice.refundAmount,
      cr: invoice.creditsRefunded,
    }))

    const callType = onlyRefunds ? 'refunded invoices' : 'paid invoices'
    logger.info(
      `sent ${payments.length} records of payment history type ${callType} for user ${userId}`
    )
    return { success: true, data: payments }
  } catch (error) {
    logger.error(`failed to get invoices history for ${userId}: ${error}`)
    return {
      success: false,
      data: [],
    }
  }
}
