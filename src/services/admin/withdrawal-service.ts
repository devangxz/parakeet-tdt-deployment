import { WithdrawalStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  checkTranscriberPayment,
  processTranscriberPayment,
} from '@/utils/backend-helper'

export async function getInitiatedWithdrawals() {
  try {
    const initiatedWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.INITIATED,
      },
    })

    logger.info('Fetched initiated withdrawals successfully')
    return {
      success: true,
      withdrawals: initiatedWithdrawals ?? [],
    }
  } catch (error) {
    logger.error('Error fetching initiated withdrawals:', error)
    return { success: false, s: 'Failed to fetch initiated withdrawals' }
  }
}

export async function getPendingWithdrawals() {
  try {
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.PENDING,
      },
    })

    logger.info('Fetched pending withdrawals successfully')
    return {
      success: true,
      withdrawals: pendingWithdrawals ?? [],
    }
  } catch (error) {
    logger.error('Error fetching pending withdrawals:', error)
    return { success: false, s: 'Failed to fetch pending withdrawals' }
  }
}

export async function initiateWithdrawal(invoiceIds: string[]) {
  try {
    const withdrawal = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.PENDING,
        invoiceId: {
          in: invoiceIds,
        },
      },
    })

    if (withdrawal.length === 0) {
      logger.error('Withdrawal invoice not found')
      return { success: false, s: 'Withdrawal invoice not found' }
    }

    await prisma.withdrawal.updateMany({
      where: {
        invoiceId: {
          in: invoiceIds,
        },
      },
      data: {
        status: WithdrawalStatus.INITIATED,
      },
    })

    logger.info('Withdrawal initiated successfully')
    return {
      success: true,
      s: 'Withdrawal initiated successfully',
    }
  } catch (error) {
    logger.error('Error initiating withdrawal:', error)
    return { success: false, s: 'Failed to initiate withdrawal' }
  }
}

export async function completeWithdrawal(invoiceIds: string[]) {
  try {
    const withdrawal = await prisma.withdrawal.findMany({
      where: {
        status: WithdrawalStatus.INITIATED,
        invoiceId: {
          in: invoiceIds,
        },
      },
    })

    if (withdrawal.length === 0) {
      logger.error('Withdrawal invoice not found')
      return { success: false, s: 'Withdrawal invoice not found' }
    }

    const processPayment = await processTranscriberPayment(invoiceIds)
    if (!processPayment) {
      logger.error('Error processing payment for withdrawal')
      return { success: false, s: 'Mass pay failed' }
    }

    await prisma.withdrawal.updateMany({
      where: {
        invoiceId: {
          in: invoiceIds,
        },
      },
      data: {
        status: WithdrawalStatus.COMPLETED,
        completedAt: new Date(),
      },
    })

    logger.info('Withdrawal completed successfully')
    return {
      success: true,
      s: 'Withdrawal completed successfully',
    }
  } catch (error) {
    logger.error('Error completing withdrawal:', error)
    return { success: false, s: 'Failed to complete withdrawal' }
  }
}

export async function checkWithdrawalStatus(batchId: string) {
  try {
    const checkStatus = await checkTranscriberPayment(batchId)
    if (!checkStatus) {
      logger.error('Error checking batch status')
      return {
        success: false,
        s: 'Batch status failed, please check batchId',
      }
    }

    logger.info('Batch status checked successfully')
    return {
      success: true,
      details: checkStatus,
    }
  } catch (error) {
    logger.error('Error checking batch payment status:', error)
    return { success: false, s: 'Failed to check withdrawal status' }
  }
}
