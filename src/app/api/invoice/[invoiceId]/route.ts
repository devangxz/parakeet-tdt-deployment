/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { Role, InvoiceStatus, InvoiceType, OrderType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { VERBATIM_PRICE, RUSH_PRICE } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  getTeamSuperAdminUserId,
  getUserRate,
  getTeamAdminUserDetails,
  getCreditsPreferences,
  applyCredits,
} from '@/utils/backend-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const { invoiceId } = params
  const orderType = request.nextUrl.searchParams.get('orderType')

  let creditsUsed = 0
  const teamAdminUserId = await getTeamSuperAdminUserId(
    user.internalTeamUserId,
    user.userId
  )
  let rates = {
    vb: VERBATIM_PRICE,
    ro: RUSH_PRICE,
  }
  const customPlanRates = await getUserRate(teamAdminUserId)
  if (!customPlanRates) {
    rates = {
      vb: VERBATIM_PRICE,
      ro: RUSH_PRICE,
    }
  } else {
    rates = {
      vb: customPlanRates.sv,
      ro: customPlanRates.ro,
    }
  }
  let isBillingEnabledForCustomer = false
  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
      include: {
        user: true,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json(
        { message: 'Invoice not found.' },
        { status: 404 }
      )
    }

    const customerDetails = await prisma.customer.findUnique({
      where: { userId: teamAdminUserId },
    })

    if (customerDetails) {
      isBillingEnabledForCustomer = customerDetails.billing
    }

    let invoiceUser = invoice.user as any
    if (invoiceUser.role === Role.INTERNAL_TEAM_USER) {
      const teamSuperAdmin = await getTeamAdminUserDetails(invoice.userId)
      if (teamSuperAdmin) {
        invoiceUser = await prisma.user.findUnique({
          where: { id: teamSuperAdmin.userId },
        })
      }
    }

    let paidByUser = null
    if (invoice.paidBy) {
      paidByUser = await prisma.user.findUnique({
        where: { id: invoice.paidBy },
      })
    }

    if (
      invoice.status === InvoiceStatus.PENDING &&
      invoice.type !== InvoiceType.ADD_CREDITS
    ) {
      const creditsPreferences = await getCreditsPreferences(invoice.userId)
      if (creditsPreferences) {
        const appliedCredits = await applyCredits(
          invoice.invoiceId,
          invoice.userId
        )
        if (appliedCredits) {
          creditsUsed = appliedCredits
        }
      }
    }
    const fileIds = invoice.itemNumber ? invoice.itemNumber.split(',') : []

    const filesWithInvoiceInfo = await prisma.invoiceFile.findMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
      include: {
        File: true,
      },
    })

    if (orderType === OrderType.TRANSCRIPTION_FORMATTING) {
      const templates = await prisma.template.findMany({
        where: {
          userId: teamAdminUserId,
        },
      })
      logger.info(`Invoice details fetched for ${invoiceId}`)

      const responseData = {
        invoice: { ...invoice, user: invoiceUser },
        files: filesWithInvoiceInfo,
        templates: templates,
        creditsUsed: creditsUsed === 0 ? invoice.creditsUsed : creditsUsed,
        rates: {
          rush_order: rates.ro,
          verbatim: rates.vb,
        },
        paidByUser,
        isBillingEnabledForCustomer,
      }

      return NextResponse.json(responseData)
    } else {
      const templates = await prisma.template.findMany({
        where: {
          OR: [{ userId: teamAdminUserId }, { userId: null }],
        },
      })
      logger.info(`Invoice details fetched for ${invoiceId}`)

      const responseData = {
        invoice: { ...invoice, user: invoiceUser },
        files: filesWithInvoiceInfo,
        templates: templates,
        creditsUsed: creditsUsed === 0 ? invoice.creditsUsed : creditsUsed,
        rates: {
          rush_order: rates.ro,
          verbatim: rates.vb,
        },
        paidByUser,
        isBillingEnabledForCustomer,
      }

      return NextResponse.json(responseData)
    }
  } catch (error) {
    logger.error(`Error fetching invoice details ${invoiceId}`, error)
    return NextResponse.json(
      { message: 'Error fetching invoice details.' },
      { status: 500 }
    )
  }
}
