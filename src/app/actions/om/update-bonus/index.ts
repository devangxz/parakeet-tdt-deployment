'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function updateBonus(formData: { fileId: string; rate: number }) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  try {
    const { fileId, rate } = formData

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

    await prisma.order.update({
      where: { fileId: fileId },
      data: { rateBonus: Number(rate), updatedAt: new Date() },
    })

    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `File Bonus Updated`,
      `${fileInformation.fileId} file bonus updated to $${rate}/ah by ${user?.email}`,
      'software'
    )

    logger.info(`rate bonus updated to $${rate}/ah, for ${fileId}`)
    return {
      success: true,
      message: 'Bonus updated successfully',
    }
  } catch (error) {
    logger.error(`Failed to update bonus`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
