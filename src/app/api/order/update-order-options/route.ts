import { InvoiceStatus, InvoiceType } from '@prisma/client'
import { NextResponse } from 'next/server'

import { VERBATIM_PRICE, RUSH_PRICE } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  getTeamSuperAdminUserId,
  getUserRate,
  getCreditsPreferences,
  applyCredits,
} from '@/utils/backend-helper'

const calculatePrice = (duration: number, rate: number) =>
  Math.round(((duration * rate) / 60) * 100) / 100

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  const { invoiceId, optionId, enabled } = await req.json()

  if (!invoiceId || !optionId || enabled === undefined) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  let creditsUsed = 0
  const customPlan = user?.customPlan
  const teamAdminUserId = await getTeamSuperAdminUserId(
    user?.internalTeamUserId,
    user?.userId
  )
  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return NextResponse.json(
        { success: false, message: 'Invoice not found.' },
        { status: 404 }
      )
    }

    let options = JSON.parse(invoice?.options ?? '')
    let totalAmount = invoice.amount
    let rates = {
      vb: VERBATIM_PRICE,
      exd: RUSH_PRICE,
    }

    if (customPlan) {
      const userRates = await getUserRate(teamAdminUserId)
      if (!userRates) {
        logger.error(`Failed to fetch custom plan rates for ${teamAdminUserId}`)
        return NextResponse.json({
          success: false,
          message: 'Failed to get custom plan rates.',
        })
      }
      rates = {
        vb: userRates.sv,
        exd: userRates.ro,
      }
    }

    const files = invoice.itemNumber ? invoice.itemNumber.split(',') : []
    for (const fileId of files) {
      const file = await prisma.file.findUnique({
        where: {
          fileId: fileId,
        },
      })
      if (!file) {
        logger.error(`File not found ${fileId}`)
        return NextResponse.json(
          { success: false, message: 'File not found.' },
          { status: 404 }
        )
      }
      if (optionId === 'exd' && parseInt(enabled) === 1) {
        options = {
          ...options,
          exd: 1,
        }
        totalAmount += calculatePrice(file.duration, rates.exd)
      } else if (optionId === 'exd' && parseInt(enabled) === 0) {
        options = {
          ...options,
          exd: 0,
        }
        totalAmount -= calculatePrice(file.duration, rates.exd)
      } else if (optionId === 'vb' && parseInt(enabled) === 1) {
        options = {
          ...options,
          vb: 1,
        }
        totalAmount += calculatePrice(file.duration, rates.vb)
      } else if (optionId === 'vb' && parseInt(enabled) === 0) {
        options = {
          ...options,
          vb: 0,
        }
        totalAmount -= calculatePrice(file.duration, rates.vb)
      }
    }

    if (optionId === 'ts' && parseInt(enabled) === 1) {
      options = {
        ...options,
        ts: 1,
      }
    } else if (optionId === 'ts' && parseInt(enabled) === 0) {
      options = {
        ...options,
        ts: 0,
      }
    } else if (optionId === 'sub' && parseInt(enabled) === 1) {
      options = {
        ...options,
        sub: 1,
      }
    } else if (optionId === 'sub' && parseInt(enabled) === 0) {
      options = {
        ...options,
        sub: 0,
      }
    } else if (optionId === 'si' && parseInt(enabled) === 1) {
      options = {
        ...options,
        si: 1,
      }
    } else if (optionId === 'si' && parseInt(enabled) === 0) {
      options = {
        ...options,
        si: 0,
      }
    } else if (optionId === 'sif' && parseInt(enabled) === 1) {
      options = {
        ...options,
        sif: 1,
      }
    } else if (optionId === 'sif' && parseInt(enabled) === 0) {
      options = {
        ...options,
        sif: 0,
      }
    }

    const updatedInvoice = await prisma.invoice.update({
      where: {
        invoiceId: invoiceId,
      },
      data: {
        options: JSON.stringify(options),
        amount: Number(totalAmount.toFixed(2)),
      },
    })

    if (
      updatedInvoice.status === InvoiceStatus.PENDING &&
      updatedInvoice.type !== InvoiceType.ADD_CREDITS
    ) {
      const creditsPreferences = await getCreditsPreferences(
        updatedInvoice.userId
      )
      if (creditsPreferences) {
        const appliedCredits = await applyCredits(
          updatedInvoice.invoiceId,
          updatedInvoice.userId
        )
        if (appliedCredits) {
          creditsUsed = appliedCredits
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalAmount,
      invoice: updatedInvoice,
      creditsUsed: creditsUsed === 0 ? updatedInvoice.creditsUsed : creditsUsed,
      message: 'Options updated successfully.',
    })
  } catch (error) {
    logger.error(`Error updating order options for ${invoiceId}`, error)
    return NextResponse.json(
      { message: 'Error updating order options.' },
      { status: 500 }
    )
  }
}
