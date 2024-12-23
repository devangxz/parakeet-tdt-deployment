'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getTemplates(email: string) {
  try {
    if (!email) {
      return {
        success: false,
        message: 'Email is required',
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

    const templates = await prisma.template.findMany({
      where: {
        userId: user.id,
      },
    })

    return { success: true, templates: templates ?? [] }
  } catch (error) {
    logger.error('Error fetching templates:', error)
    return {
      success: false,
      message: 'Failed to fetch templates',
    }
  }
}
