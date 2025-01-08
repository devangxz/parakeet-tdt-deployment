'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getEnabledCustomersAction(userEmail: string) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    if (!user.Verifier) {
      return {
        success: false,
        message: 'Verifier not found',
      }
    }

    return {
      success: true,
      customers: user.Verifier.enabledCustomers,
    }
  } catch (error) {
    logger.error(`Error while getting enabled customers`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
      customers: '',
    }
  }
}

export async function updateEnabledCustomersAction(
  userEmail: string,
  customers: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
      include: {
        Verifier: true,
      },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    if (!user.Verifier) {
      return {
        success: false,
        message: 'Verifier not found',
      }
    }

    await prisma.verifier.update({
      where: {
        userId: user.id,
      },
      data: {
        enabledCustomers: customers,
      },
    })

    return {
      success: true,
      message: 'Enabled customers updated successfully',
    }
  } catch (error) {
    logger.error(`Error while updating enabled customers`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
