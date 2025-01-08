'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function addTestCustomer(userEmail: string, flag: boolean) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
    })

    if (!user) {
      logger.error(`User not found`, {
        userEmail,
      })
      return {
        success: false,
        s: 'User not found',
      }
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: user.id,
      },
    })

    if (!customer) {
      logger.error(`Customer not found`, {
        userEmail,
      })
      return {
        success: false,
        s: 'Customer not found',
      }
    }

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        isTestCustomer: flag,
      },
    })

    logger.info(`Test customer updated successfully`, {
      userEmail,
      flag,
    })

    return {
      success: true,
      s: 'Customer updated successfully',
    }
  } catch (error) {
    logger.error(`Error while updating test customer`, error)
    return {
      success: false,
      s: 'An error occurred. Please try again after some time.',
    }
  }
}
