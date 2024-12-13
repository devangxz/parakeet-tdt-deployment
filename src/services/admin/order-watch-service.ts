import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

interface UpdateOrderWatchParams {
  userEmail: string
  flag: boolean
}

export async function updateOrderWatch({
  userEmail,
  flag,
}: UpdateOrderWatchParams) {
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

  if (user.role !== Role.CUSTOMER) {
    logger.error(`User is not a customer: ${userEmail}`)
    return { success: false, s: 'User is not a customer' }
  }

  try {
    await prisma.customer.upsert({
      where: { userId: user.id },
      update: { watch: flag },
      create: {
        userId: user.id,
        watch: flag,
      },
    })

    logger.info(
      `successfully ${flag ? 'added' : 'removed'} customer to order watch for ${
        user.email
      }`
    )

    return {
      success: true,
      s: `Customer ${flag ? 'added' : 'removed'} to order watch successfully`,
    }
  } catch (error) {
    logger.error('Error updating order watch status:', error)
    return { success: false, s: 'Failed to update order watch status' }
  }
}
