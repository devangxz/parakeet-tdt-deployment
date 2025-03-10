import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface UpdateVerifierParams {
  userEmail: string
  flag: boolean
}

export async function updateCustomFormattingReview({
  userEmail,
  flag,
}: UpdateVerifierParams) {
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
      update: { cfReviewEnabled: flag },
      create: {
        userId: user.id,
        cfReviewEnabled: flag,
      },
    })

    logger.info(
      `successfully ${
        flag ? 'enabled' : 'disabled'
      } custom formatting review for ${user.email}`
    )

    return {
      success: true,
      s: `Successfully ${
        flag ? 'enabled' : 'disabled'
      } custom formatting review`,
    }
  } catch (error) {
    logger.error('Error updating custom formatting review:', error)
    return {
      success: false,
      s: 'Failed to update custom formatting review status',
    }
  }
}

export async function updateACRReview({
  userEmail,
  flag,
}: UpdateVerifierParams) {
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
      update: { acrReviewEnabled: flag },
      create: {
        userId: user.id,
        acrReviewEnabled: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'enabled' : 'disabled'} ACR review for ${
        user.email
      }`
    )

    return {
      success: true,
      s: `Successfully ${flag ? 'enabled' : 'disabled'} ACR review`,
    }
  } catch (error) {
    logger.error('Error updating ACR review:', error)
    return {
      success: false,
      s: 'Failed to update ACR review status',
    }
  }
}

export async function updatePreDelivery({
  userEmail,
  flag,
}: UpdateVerifierParams) {
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

  if (user.role !== Role.CUSTOMER) {
    logger.error(`User is not customer: ${userEmail}`)
    return { success: false, s: 'User is not a customer' }
  }

  try {
    await prisma.customer.update({
      where: { userId: user.id },
      data: {
        isPreDeliveryEligible: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'enabled' : 'disabled'} pre delivery for ${
        user.email
      }`
    )

    return {
      success: true,
      s: `Successfully ${flag ? 'enabled' : 'disabled'} pre delivery`,
    }
  } catch (error) {
    logger.error('Error updating pre delivery status:', error)
    return { success: false, s: 'Failed to update pre delivery status' }
  }
}

export async function updateGeneralFinalizer({
  userEmail,
  flag,
}: UpdateVerifierParams) {
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
      update: { generalFinalizerEnabled: flag },
      create: {
        userId: user.id,
        generalFinalizerEnabled: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'enabled' : 'disabled'} general finalizer for ${
        user.email
      }`
    )

    return {
      success: true,
      s: `Successfully ${flag ? 'enabled' : 'disabled'} general finalizer`,
    }
  } catch (error) {
    logger.error('Error updating general finalizer:', error)
    return {
      success: false,
      s: 'Failed to update general finalizer status',
    }
  }
}
