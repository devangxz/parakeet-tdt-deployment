'use server'

import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processPayment } from '@/services/payment-service/process-payment'
import {
  getCreditsBalance,
  generateUniqueTransactionId,
  isNewCustomer,
} from '@/utils/backend-helper'

interface CheckoutViaCreditsPayload {
  invoiceId: string
  orderType: string
  dueDate?: string
}

export async function checkoutViaCredits(payload: CheckoutViaCreditsPayload) {
  const { invoiceId, orderType, dueDate } = payload
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    if (!userId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    if (!invoiceId || !orderType) {
      return {
        success: false,
        message: 'Invoice ID and order type are required.',
      }
    }

    const creditsBalance = await getCreditsBalance(userId)

    if (creditsBalance <= 0) {
      logger.error(
        `rejecting attempt to apply credits with ${creditsBalance} to ${invoiceId}`
      )

      return {
        success: false,
        message:
          'Credits cannot be applied as your account credit balance is 0',
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return {
        success: false,
        message: 'Invoice not found',
      }
    }

    if (invoice.status !== InvoiceStatus.PENDING) {
      logger.error(`Invoice is not pending ${invoiceId}`)
      return {
        success: false,
        message: 'Invoice is not pending',
      }
    }

    const totalAmount = (invoice.amount - invoice.discount).toFixed(2)

    const creditsUsed = parseFloat(totalAmount)

    if (creditsUsed > creditsBalance) {
      logger.error(
        `rejecting attempt to apply credits with ${creditsBalance} to ${invoiceId}`
      )

      return {
        success: false,
        message:
          'Credits cannot be applied as your account credit balance is lesser than total amount',
      }
    }

    const transactionId = generateUniqueTransactionId()
    await processPayment(
      invoiceId,
      invoice.type,
      orderType,
      transactionId,
      user?.userId,
      dueDate
    )

    const invoiceData = await prisma.invoice.update({
      where: { invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        transactionId,
        paymentMethod: PaymentMethod.CREDITS,
        updatedAt: new Date(),
        creditsUsed,
        paidBy: user?.userId,
      },
    })
    logger.info(`Payment credits successful for invoice ${invoiceId}`)
    const newCustomer = await isNewCustomer(userId as number)
    return {
      success: true,
      transactionId,
      paymentMethod: PaymentMethod.CREDITS,
      pp_account: '',
      cc_last4: '',
      invoice: invoiceData,
      isNewCustomer: newCustomer,
    }
  } catch (error) {
    logger.error(`Failed charged credits payment for ${invoiceId}`, error)
    return {
      success: false,
      message: 'Failed to charge credits payment',
    }
  }
}
