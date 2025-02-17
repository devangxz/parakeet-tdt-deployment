'use server'
import { PaymentMethod } from '@prisma/client'

import prisma from '@/lib/prisma'

interface FetchPaypalAmountParams {
  startDate: string
  endDate: string
}

export async function fetchPaypalAmount({
  startDate,
  endDate,
}: FetchPaypalAmountParams): Promise<number> {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const result = await prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      paymentMethod: PaymentMethod.PAYPAL,
      status: 'PAID',
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  })

  return result._sum.amount || 0
}
