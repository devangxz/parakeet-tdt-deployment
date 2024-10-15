import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { redis } from '@/lib/redis'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  try {
    if (!sessionId) {
      return NextResponse.json({ error: 'No session ID provided' })
    }
    const userInfo = await redis.get(sessionId)
    if (!userInfo) {
      return NextResponse.json({
        success: false,
        message: 'User information not found',
      })
    }

    return NextResponse.json({ success: true, user: JSON.parse(userInfo) })
  } catch (error) {
    logger.error(`Error retrieving user info ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve user info',
    })
  }
}
