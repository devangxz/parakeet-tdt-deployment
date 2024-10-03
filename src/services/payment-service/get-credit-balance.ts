import { InvoiceType, InvoiceStatus } from '@prisma/client'

import prisma from '@/lib/prisma'

export const getCreditBalance = async (
  userId: number,
  internalTeamUserId: number | null
) => {
  const customerId = internalTeamUserId || userId

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        userId: customerId,
        type: {
          in: [
            InvoiceType.TRANSCRIPT,
            InvoiceType.ADDL_FORMATTING,
            InvoiceType.ADDL_PROOFREADING,
            InvoiceType.ADD_CREDITS,
            InvoiceType.FREE_CREDITS,
          ],
        },
        status: {
          in: [InvoiceStatus.PAID, InvoiceStatus.BILLED],
        },
      },
    })

    const creditsBalance = invoices.reduce((acc, invoice) => {
      if (['ADD_CREDITS', 'FREE_CREDITS'].includes(invoice.type)) {
        return acc + (invoice.amount - invoice.refundAmount)
      } else {
        return acc + (invoice.creditsRefunded - invoice.creditsUsed)
      }
    }, 0)

    const roundedCreditsBalance = Math.round(creditsBalance * 100) / 100
    console.info(`Credit balance ${creditsBalance} for ${customerId}`)
    return {
      success: true,
      creditsBalance: roundedCreditsBalance || 0,
    }
  } catch (err) {
    console.error('Error fetching credit balance:', err)
    return {
      success: false,
      creditsBalance: 0,
    }
  }
}
