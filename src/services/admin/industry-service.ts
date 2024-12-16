/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface UpdateIndustryParams {
  id: string | number
  industry: string
}

export async function updateIndustry({ id, industry }: UpdateIndustryParams) {
  try {
    let filter = {}

    if (!isNaN(Number(id))) {
      filter = { id: parseInt(id as string) }
    } else {
      filter = { email: id }
    }

    const user = await prisma.user.findUnique({
      where: filter as any,
    })

    if (!user) {
      logger.error(`User not found with email ${id}`)
      return { success: false, s: 'User not found' }
    }

    if (user.role !== Role.CUSTOMER) {
      logger.error(`User is not a customer: ${id}`)
      return { success: false, s: 'User is not a customer' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        industry,
      },
    })

    logger.info(`Successfully updated industry for user ${user.email}`)
    return {
      success: true,
      s: 'Successfully updated industry',
    }
  } catch (error) {
    logger.error('Error updating industry:', error)
    return { success: false, s: 'Failed to update industry' }
  }
}
