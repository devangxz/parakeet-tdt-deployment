'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { getAWSSesInstance } from '@/lib/ses'

export async function sendOrderReReviewEmail(message: string, fileId: string) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  const userId = user.userId
  const userEmail = user.email

  try {
    const order = await prisma.order.findUnique({
      where: {
        fileId: fileId,
      },
    })

    if (!order) {
      logger.error('Order not found', { fileId })
      return {
        success: false,
        message: 'Failed to send email',
      }
    }

    await prisma.order.update({
      where: {
        fileId: fileId,
      },
      data: {
        reReview: true,
        reReviewComment: message,
      },
    })

    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `Order Re-Review`,
      `${userEmail} ${userId} has requested a re-review for file ${fileId}. Here is the customer message: ${message}`,
      'software'
    )

    logger.info(`Order re-review updated ${fileId}`)
    return {
      success: true,
      message: 'Email sent successfully',
    }
  } catch (error) {
    logger.error('Error sending order re-review email:', error)
    return {
      success: false,
      message: 'Failed to send email',
    }
  }
}
