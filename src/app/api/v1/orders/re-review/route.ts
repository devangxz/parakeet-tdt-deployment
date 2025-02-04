import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { message, fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: 'fileId is required' },
        { status: 400 }
      )
    }

    const userId = user.userId
    const userEmail = user.email

    const awsSes = getAWSSesInstance()
    await awsSes.sendAlert(
      `Order Re-Review`,
      `${userEmail} ${userId} has requested a re-review for file ${fileId}. Here is the customer message: ${
        message ?? ''
      }`,
      'software'
    )

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    })
  } catch (error) {
    logger.error('Error sending order re-review email:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to send email' },
      { status: 500 }
    )
  }
}
