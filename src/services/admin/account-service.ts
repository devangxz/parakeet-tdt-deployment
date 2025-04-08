import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getCreditsBalance } from '@/utils/backend-helper'
import isValidEmail from '@/utils/isValidEmail'

interface UpdateAccountStatusParams {
  userEmail: string
  flag: boolean
}

interface TransferFilesParams {
  userEmail: string
  fileIds: string[]
}

interface TransferCreditParams {
  invd: string
  em: string
}

export async function updateAccountStatus({
  userEmail,
  flag,
}: UpdateAccountStatusParams) {
  if (!isValidEmail(userEmail)) {
    logger.error(`Invalid email: ${userEmail}`)
    return { success: false, s: 'Invalid email' }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: userEmail,
    },
  })

  if (!user) {
    logger.error(`User not found with email ${userEmail}`)
    return { success: false, s: 'User not found' }
  }

  try {
    await prisma.user.update({
      where: {
        email: userEmail,
      },
      data: {
        status: flag ? 'SUSPENDED' : 'VERIFIED',
      },
    })

    logger.info(
      `successfully ${flag ? 'suspended' : 'reinstated'} account of ${
        user.email
      }`
    )

    return {
      success: true,
      s: `Successfully ${flag ? 'suspended' : 'reinstated'} account`,
    }
  } catch (error) {
    logger.error('Error updating account status:', error)
    return { success: false, s: 'Failed to update account status' }
  }
}

export async function transferFiles({
  userEmail,
  fileIds,
}: TransferFilesParams) {
  if (!isValidEmail(userEmail)) {
    logger.error(`Invalid email: ${userEmail}`)
    return { success: false, s: 'Invalid email' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return { success: false, s: 'User not found' }
    }

    const files = await prisma.file.findMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
      select: {
        user: true,
      },
    })

    if (files.length === 0) {
      logger.error(`Files not found with ids ${fileIds}`)
      return { success: false, s: 'Files not found' }
    }

    const UserRole = files[0].user.role
    if (UserRole !== Role.ADMIN) {
      logger.error('File transfer is only allowed from admin account')
      return {
        success: false,
        s: 'File transfer only allowed from admin account to user',
      }
    }

    await prisma.file.updateMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
      data: {
        userId: user.id,
      },
    })

    logger.info(`files transferred successfully for user ${user.email}`)
    return {
      success: true,
      s: 'Files transferred successfully',
    }
  } catch (error) {
    logger.error('Error transferring files:', error)
    return { success: false, s: 'Failed to transfer files' }
  }
}

export async function transferCredit({ invd, em }: TransferCreditParams) {
  try {
    const toUser = await prisma.user.findUnique({
      where: {
        email: em.toLowerCase(),
        role: {
          in: [
            Role.CUSTOMER,
            Role.ADMIN,
            Role.SUPERADMIN,
            Role.INTERNAL_TEAM_USER,
          ],
        },
      },
    })

    if (!toUser) {
      logger.error(`'${em}' user was not found`)
      return { success: false, s: `'${em}' user was not found` }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { invoiceId: invd },
      include: { user: true },
    })

    if (!invoice) {
      logger.error(`Invoice with id ${invd} not found`)
      return { success: false, s: 'Invoice not found' }
    }

    const fromUserId = invoice.userId
    const transferAmount = invoice.amount
    const fromUserCreditsBalance = await getCreditsBalance(fromUserId)

    if (fromUserCreditsBalance < transferAmount) {
      logger.error(`Insufficient credits for user ${fromUserId}`)
      return { success: false, s: 'Insufficient credits' }
    }

    await prisma.invoice.update({
      where: { invoiceId: invd },
      data: { userId: toUser.id },
    })

    logger.info(`Credits transferred from ${fromUserId} to ${toUser.id}`)
    return { success: true, s: 'Credits transferred' }
  } catch (error) {
    logger.error('Error transferring credits:', error)
    return { success: false, s: 'Failed to transfer credits' }
  }
}
