export const dynamic = 'force-dynamic'
import { InvoiceType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getCreditsBalance } from '@/utils/backend-helper'

const type_map = {
  TRANSCRIPT: 'Manual Transcript',
  ADDL_FORMATTING: 'Additional Formatting',
  ADDL_PROOFREADING: 'Additional Charge',
  ADD_CREDITS: 'Bought credits',
  FREE_CREDITS: 'Free credits',
  WITHDRAWAL: 'Withdrawal',
  FORMATTING: 'Formatting',
  CAPTIONING: 'Captioning',
  PP_ADD_FUNDS: 'PayPal Add Funds',
  // These are deprecated types from the old system
  //'PLAN', 'STORAGE', 'EXP_DELIVERY', 'BONUS', 'SALARY', 'DUPLICATE', 'DEFICIT', 'TYPE_CHANGE', 'SUBTITLE', 'AUTO_TR', 'PRO_SUBSCRIPTION', 'ENTERPRISE_SUBSCRIPTION', 'CUSTOMER_REFERRAL_CREDITS', 'MISC_ADDL_FORMATTING', 'MISC_CAPTIONING'
  DEPRECATED: 'Deprecated',
}

export async function GET(req: NextRequest) {
  const response = {
    credits_balance: 0,
    credits_preference: { rtc: 0, ucd: 1 },
    has_group_members: false,
    credit_history: [] as {
      id: string
      fullname: string
      email: string
      ts: string
      t: string
      amt: number
      dn: string
      un: string
    }[],
  }
  const user = await authenticateRequest(req)
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  const selectedId = user?.internalTeamUserId || user?.userId
  try {
    response.credits_balance = await getCreditsBalance(selectedId)

    // Get Account Preference Options
    const customer = await prisma.customer.findUnique({
      where: { userId: selectedId },
      select: {
        refundToCredits: true,
        useCreditsDefault: true,
      },
    })

    if (customer) {
      response.credits_preference.rtc = customer.refundToCredits ? 1 : 0
      response.credits_preference.ucd = customer.useCreditsDefault ? 1 : 0
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: {
        team: {
          members: {
            some: {
              userId: selectedId,
            },
          },
        },
        userId: {
          not: selectedId,
        },
      },
    })

    response.has_group_members = teamMembers.length > 0

    const creditHistory = await prisma.invoice.findMany({
      where: {
        userId: selectedId,
        type: {
          in: [InvoiceType.ADD_CREDITS, InvoiceType.FREE_CREDITS],
        },
        status: 'PAID',
      },
      orderBy: {
        ts: 'desc',
      },
      include: {
        user: {
          select: {
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    })

    const invoices = creditHistory.map((row) => {
      const fullname =
        row.user.firstname && row.user.lastname
          ? `${row.user.firstname} ${row.user.lastname}`
          : ''
      const email = row.user.email
      const user_name = fullname ? `${fullname} (${email})` : email
      const type_name = type_map[row.type]
      const amount = row.amount
      const formatted_ts = new Date(row.createdAt).toUTCString()

      return {
        id: row.invoiceId,
        fullname,
        email,
        ts: formatted_ts,
        t: row.type,
        amt: amount,
        dn: type_name,
        un: ['FREE_CREDITS'].includes(row.type) ? '-' : user_name,
      }
    })

    response.credit_history = invoices

    logger.info(
      `found $${response.credits_balance} credits balance for user ${selectedId}`
    )
    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    logger.error(`Error fetching credits history for ${selectedId}`, error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
