/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'
import { Role, InvoiceStatus, InvoiceType } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { VERBATIM_PRICE, RUSH_PRICE } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import {
  getTeamSuperAdminUserId,
  getUserRate,
  getTeamAdminUserDetails,
  getCreditsPreferences,
  applyCredits,
} from '@/utils/backend-helper'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const invoiceId = searchParams.get('invoiceId')

    if (!invoiceId) {
      return NextResponse.json(
        { message: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    let creditsUsed = 0
    const teamAdminUserId = await getTeamSuperAdminUserId(
      user?.internalTeamUserId ?? null,
      user?.userId ?? 0
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
        { message: 'Invoice not found' },
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

    logger.info(`Invoice details fetched for ${invoiceId}`)

    const responseData = {
      success: true,
      data: {
        invoice: {
          id: invoice.id,
          invoiceId: invoice.invoiceId,
          amount: invoice.amount,
          discount: invoice.discount,
          type: invoice.type,
          fee: invoice.fee,
          status: invoice.status,
          paymentMethod: invoice.paymentMethod,
          transactionId: invoice.transactionId,
          creditsUsed: invoice.creditsUsed,
          refundAmount: invoice.refundAmount,
          user: invoiceUser,
          createdAt: invoice.createdAt,
          instructions: invoice.instructions,
          options: invoice.options,
          itemNumber: invoice.itemNumber,
          creditsRefunded: invoice.creditsRefunded,
        },
        files: filesWithInvoiceInfo,
        creditsUsed: creditsUsed === 0 ? invoice.creditsUsed : creditsUsed,
        rates: {
          rush_order: rates.ro,
          verbatim: rates.vb,
        },
        paidByUser,
        isBillingEnabledForCustomer,
      },
    }

    return NextResponse.json(responseData)
  } catch (error) {
    logger.error(`Error fetching invoice details: ${error}`)
    return NextResponse.json(
      { message: 'Error fetching invoice details' },
      { status: 500 }
    )
  }
}
