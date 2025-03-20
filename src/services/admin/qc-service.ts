import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface UpdateQCStatusParams {
  userEmail: string
  flag: boolean
}

export async function updateQCStatus({
  userEmail,
  flag,
}: UpdateQCStatusParams) {
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

  if (!['QC', 'REVIEWER'].includes(user.role)) {
    logger.error(`User is not a QC: ${userEmail}`)
    return { success: false, s: 'User is not a QC or a Reviewer' }
  }

  try {
    await prisma.verifier.upsert({
      where: { userId: user.id },
      update: { qcDisabled: flag },
      create: {
        userId: user.id,
        qcDisabled: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'disabled' : 'enabled'} qc for ${user.email}`
    )

    return {
      success: true,
      s: `QC ${flag ? 'disabled' : 'enabled'} successfully`,
    }
  } catch (error) {
    logger.error('Error updating QC status:', error)
    return { success: false, s: 'Failed to update QC status' }
  }
}

export async function updateCustomFormattingBonus({
  userEmail,
  flag,
}: UpdateQCStatusParams) {
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

  if (user.role !== Role.QC && user.role !== Role.REVIEWER) {
    logger.error(`User is not a QC: ${userEmail}`)
    return { success: false, s: 'User is not a QC' }
  }

  try {
    await prisma.verifier.upsert({
      where: { userId: user.id },
      update: { cfBonusEnabled: flag },
      create: {
        userId: user.id,
        cfBonusEnabled: flag,
      },
    })

    logger.info(
      `successfully ${
        flag ? 'enabled' : 'disabled'
      } custom formatting bonus for ${user.email}`
    )

    return {
      success: true,
      s: `Successfully ${
        flag ? 'enabled' : 'disabled'
      } custom formatting bonus`,
    }
  } catch (error) {
    logger.error('Error updating custom formatting bonus:', error)
    return {
      success: false,
      s: 'Failed to update custom formatting bonus status',
    }
  }
}
