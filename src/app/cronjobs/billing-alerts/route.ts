import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST() {
  try {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastMonthNum = lastMonth.getMonth() + 1
    const lastMonthYear = lastMonth.getFullYear()
    logger.info(
      `triggered billing alert cron job for ${lastMonthNum}/${lastMonthYear}`
    )

    const customers = await prisma.customer.findMany({
      where: { billing: true },
      include: {
        user: {
          include: {
            Organization: true,
          },
        },
      },
    })

    for (const customer of customers) {
      const { id: userId, Organization } = customer.user
      const organization = Organization?.name ?? 'Customer'

      const invoices = await prisma.invoice.findMany({
        where: {
          userId,
          status: InvoiceStatus.PAID,
          paymentMethod: PaymentMethod.BILLING,
          createdAt: {
            gte: new Date(lastMonthYear, lastMonthNum - 1, 1),
            lt: new Date(lastMonthYear, lastMonthNum, 1),
          },
        },
        select: {
          id: true,
          amount: true,
          discount: true,
          refundAmount: true,
          invoiceId: true,
        },
      })

      if (invoices.length === 0) {
        logger.info(
          `No bills found for ${organization} for ${lastMonthYear}/${lastMonthNum}`
        )
        continue
      }

      const invoiceIds = invoices.map((invoice) => invoice.invoiceId)
      const total = invoices.reduce(
        (sum, invoice) =>
          sum + (invoice.amount - invoice.discount - invoice.refundAmount),
        0
      )

      const emailData = {
        userEmailId: 'support@scribie.com',
      }

      const templateData = {
        organization: organization,
        invoiceIds: invoiceIds.join('\n'),
      }

      const ses = getAWSSesInstance()

      await ses.sendMail('BILLING_ALERT', emailData, templateData)

      logger.info(
        `Bill for ${organization} is ${total} for ${lastMonthYear}/${lastMonthNum}`
      )
    }

    return NextResponse.json({
      message: 'Billing alerts sent successfully.',
    })
  } catch (error) {
    logger.error(`Failed to send billing alerts, ${error}`)
    return NextResponse.json(
      {
        message: 'Failed to send billing alerts.',
      },
      { status: 500 }
    )
  }
}
