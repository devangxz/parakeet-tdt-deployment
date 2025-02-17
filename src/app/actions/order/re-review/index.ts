'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
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
    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `Order Re-Review`,
      `${userEmail} ${userId} has requested a re-review for file ${fileId}. Here is the customer message: ${message}`,
      'software'
    )
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
