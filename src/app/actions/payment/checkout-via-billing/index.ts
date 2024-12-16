'use server'

import { InvoiceStatus, PaymentMethod } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { processPayment } from '@/services/payment-service/process-payment'
import {
  getTeamSuperAdminUserId,
  generateUniqueTransactionId,
} from '@/utils/backend-helper'

interface CheckoutViaBillingPayload {
  invoiceId: string
  orderType: string
}

export async function checkoutViaBilling(payload: CheckoutViaBillingPayload) {
  const { invoiceId, orderType } = payload
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

    const customerUserId = await getTeamSuperAdminUserId(
      user?.internalTeamUserId,
      user?.userId
    )

    const customerDetails = await prisma.customer.findUnique({
      where: { userId: customerUserId },
    })

    if (!customerDetails) {
      logger.error(`Customer not found for user ${customerUserId}`)
      return {
        success: false,
        message: 'Customer not found',
      }
    }

    if (!customerDetails.billing) {
      logger.error(`Billing not enabled for user ${customerUserId}`)
      return {
        success: false,
        message: 'Billing not enabled',
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

    const transactionId = generateUniqueTransactionId()
    await processPayment(
      invoiceId,
      invoice.type,
      orderType,
      transactionId,
      user?.userId
    )

    const invoiceData = await prisma.invoice.update({
      where: { invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        transactionId,
        paymentMethod: PaymentMethod.BILLING,
        updatedAt: new Date(),
        paidBy: user?.userId,
      },
    })
    logger.info(`Payment billing successful for invoice ${invoiceId}`)
    return {
      success: true,
      transactionId,
      paymentMethod: PaymentMethod.BILLING,
      pp_account: '',
      cc_last4: '',
      invoice: invoiceData,
    }
  } catch (error) {
    logger.error(`Failed billing payment for ${invoiceId}`, error)
    return {
      success: false,
      message: 'Failed billing payment',
    }
  }
}
