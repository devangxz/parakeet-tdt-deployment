'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function addOrganization(name: string, email: string) {
  try {
    if (!name || !email) {
      return {
        success: false,
        message: 'Name and email are required',
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      }
    }

    const existingOrganization = await prisma.organization.findFirst({
      where: {
        name: name.toUpperCase(),
        userId: user.id,
      },
    })

    if (existingOrganization) {
      return {
        success: false,
        message: 'Organization already added for this user',
      }
    }

    const newOrganization = await prisma.organization.create({
      data: {
        name: name.toUpperCase(),
        userId: user.id,
      },
    })

    return {
      success: true,
      message: 'Organization added successfully',
      organization: newOrganization,
    }
  } catch (error) {
    logger.error('Error adding organization:', error)
    return {
      success: false,
      message: 'Internal server error',
    }
  }
}
