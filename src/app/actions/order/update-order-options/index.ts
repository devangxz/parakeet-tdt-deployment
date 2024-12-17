'use server'

import { InvoiceStatus, InvoiceType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
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

export async function updateOrderOptions(
  invoiceId: string,
  optionId: string,
  enabled: string
) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  let creditsUsed = 0
  const customPlan = user?.customPlan
  const teamAdminUserId = await getTeamSuperAdminUserId(
    user?.internalTeamUserId as number | null,
    user?.userId as number
  )

  try {
    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId: invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return {
        success: false,
        message: 'Invoice not found.',
      }
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
        return {
          success: false,
          message: 'Failed to get custom plan rates.',
        }
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
        return {
          success: false,
          message: 'File not found.',
        }
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

    return {
      success: true,
      totalAmount,
      invoice: updatedInvoice,
      creditsUsed: creditsUsed === 0 ? updatedInvoice.creditsUsed : creditsUsed,
      message: 'Options updated successfully.',
    }
  } catch (error) {
    logger.error(`Error updating order options for ${invoiceId}`, error)
    return {
      success: false,
      message: 'Error updating order options.',
    }
  }
}
