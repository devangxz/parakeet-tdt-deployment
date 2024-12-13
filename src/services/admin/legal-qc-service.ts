import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface AddLegalQCParams {
  userEmail: string
  flag: boolean
}

export async function updateLegalQC({ userEmail, flag }: AddLegalQCParams) {
  if (!isValidEmail(userEmail)) {
    logger.error(`Invalid email: ${userEmail}`)
    return { success: false, s: 'Invalid email' }
  }

  const user = await prisma.user.findUnique({
    where: {
      email: userEmail.toLowerCase(),
    },
  })

  if (!user) {
    logger.error(`User not found with email ${userEmail}`)
    return { success: false, s: 'User not found' }
  }

  if (user.role !== Role.QC && user.role !== Role.REVIEWER) {
    logger.error(`User is not a QC or a Reviewer: ${userEmail}`)
    return { success: false, s: 'User is not a QC' }
  }

  try {
    await prisma.verifier.upsert({
      where: { userId: user.id },
      update: { legalEnabled: flag },
      create: {
        userId: user.id,
        legalEnabled: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'added' : 'removed'} legal qc for ${user.email}`
    )

    return {
      success: true,
      s: `QC ${flag ? 'added' : 'removed'} to legal successfully`,
    }
  } catch (error) {
    logger.error('Error updating legal QC:', error)
    return { success: false, s: 'Failed to update legal QC status' }
  }
}
