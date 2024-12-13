'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function updateAccent(formData: {
  fileId: string
  accentCode: string
}) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.userId as number
  try {
    const { fileId, accentCode } = formData

    if (!fileId) {
      return {
        success: false,
        message: 'File Id parameter is required.',
      }
    }

    const fileInformation = await prisma.file.findUnique({
      where: { fileId: fileId },
    })

    if (!fileInformation) {
      logger.error(`File not found for ${fileId}`)
      return {
        success: false,
        message: 'File not found',
      }
    }

    await prisma.fileAccent.create({
      data: {
        userId: userId,
        fileId: fileId,
        accentCode: accentCode,
      },
    })

    logger.info(
      `Accent set to ${accentCode} for file ${fileId} by user ${userId}`
    )
    return {
      success: true,
      message: 'Accent updated successfully',
    }
  } catch (error) {
    logger.error(`Failed to update accent`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
