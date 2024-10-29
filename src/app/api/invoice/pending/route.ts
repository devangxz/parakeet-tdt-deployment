export const dynamic = 'force-dynamic'
import { InvoiceType, InvoiceStatus, OrderStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: userId,
        type: {
          notIn: [InvoiceType.TRANSCRIPT],
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
    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    logger.error(`failed to get pending invoices for ${userId}: ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
