'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function deleteInvoiceAction(invoiceId: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    const invoice = await prisma.invoice.findUnique({
      where: {
        invoiceId,
      },
    })

    if (!invoice) {
      logger.error(`Invoice not found ${invoiceId}`)
      return {
        success: false,
        message: 'Invoice not found.',
      }
    }

    if (invoice.userId !== userId) {
      logger.error(`Unauthorized access to delete invoice ${invoiceId}`)
      return {
        success: false,
        message: 'Unauthorized access.',
      }
    }

    await prisma.invoice.delete({
      where: {
        invoiceId,
      },
    })

    logger.info(`Invoice deleted ${invoiceId}`)
    return {
      success: true,
      message: 'Successfully deleted invoice',
    }
  } catch (error) {
    logger.error(`Failed to delete invoice ${invoiceId}: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
