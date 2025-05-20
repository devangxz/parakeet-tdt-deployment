'use server'

import { InvoiceType, InvoiceStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { refundFileAction } from '@/app/actions/admin/refund-file'
import { getRefundAmountAction } from '@/app/actions/file/cancel-order'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getTotalHDRefundAmountAction() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        type: InvoiceType.ADDL_PROOFREADING,
        status: InvoiceStatus.PENDING,
      },
    })

    const fileIdSet = new Set<string>()
    for (const inv of invoices) {
      inv.itemNumber?.split(',').forEach((fid) => fileIdSet.add(fid))
    }
    let total = 0
    for (const fileId of Array.from(fileIdSet)) {
      const resp = await getRefundAmountAction(fileId)
      if (resp.success) {
        total += Number(resp.amount)
      }
    }
    return { success: true, amount: total.toFixed(2) }
  } catch (error) {
    logger.error('Error getting total refund amount for high difficulty', error)
    return {
      success: false,
      message: 'Failed to calculate total refund amount',
    }
  }
}

export async function refundHighDifficultyAction() {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId
    if (!userId) {
      return { success: false, message: 'User not authenticated' }
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        type: InvoiceType.ADDL_PROOFREADING,
        status: InvoiceStatus.PENDING,
      },
    })

    const fileIdSet = new Set<string>()
    for (const inv of invoices) {
      // delete pending invoice
      await prisma.invoice.delete({ where: { invoiceId: inv.invoiceId } })
      inv.itemNumber?.split(',').forEach((fid) => fileIdSet.add(fid))
    }

    for (const fileId of Array.from(fileIdSet)) {
      const resp = await getRefundAmountAction(fileId)
      if (resp.success) {
        await refundFileAction(fileId, Number(resp.amount))
      } else {
        logger.error(`Failed to get refund amount for file ${fileId}`, resp)
      }
    }

    return { success: true }
  } catch (error) {
    logger.error('Error processing refund for high difficulty files', error)
    return { success: false, message: 'Failed to process refunds' }
  }
}
