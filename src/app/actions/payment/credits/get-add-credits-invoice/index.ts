'use server'

import { InvoiceType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import gateway from '@/lib/braintree'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  generateInvoiceId,
  checkBraintreeCustomer,
} from '@/utils/backend-helper'

interface GetAddCreditsInvoicePayload {
  amount: string
}

export async function getAddCreditsInvoice(
  payload: GetAddCreditsInvoicePayload
) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const selectedId = user?.internalTeamUserId || user?.userId

    if (!selectedId) {
      return {
        success: false,
        message: 'User not authenticated',
      }
    }

    const { amount } = payload
    const invoiceId = generateInvoiceId('CGCR')
    let token = ''

    const invoice = await prisma.invoice.create({
      data: {
        invoiceId,
        userId: selectedId,
        type: InvoiceType.ADD_CREDITS,
        amount: parseFloat(amount),
      },
    })

    const checkBraintreeCustomerExists = await checkBraintreeCustomer(
      selectedId
    )

    if (!checkBraintreeCustomerExists) {
      const response = await gateway.clientToken.generate({})
      token = response.clientToken
    } else {
      const response = await gateway.clientToken.generate({
        customerId: selectedId.toString(),
      })
      token = response.clientToken
    }

    logger.info(
      `generated add credit ${invoiceId} for amount ${amount} for user ${selectedId}`
    )

    return {
      success: true,
      data: { token, invoiceId, invoice },
    }
  } catch (error) {
    logger.error(`Error generating add credits invoice`, error)

    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
