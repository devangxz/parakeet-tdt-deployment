'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function addTemplate(name: string, email: string) {
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

    const existingTemplate = await prisma.template.findFirst({
      where: {
        name,
        userId: user.id,
      },
    })

    if (existingTemplate) {
      return {
        success: false,
        message: 'Template already exists for this user',
      }
    }

    const newTemplate = await prisma.template.create({
      data: {
        name,
        userId: user.id,
      },
    })

    return {
      success: true,
      message: 'Template added successfully',
      template: newTemplate,
    }
  } catch (error) {
    logger.error('Error adding template:', error)
    return {
      success: false,
      message: 'Internal server error',
    }
  }
}
