export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function GET(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  try {
    const userId = user?.userId
    const userInfo = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        paypalId: true,
      },
    })

    return NextResponse.json({ success: true, id: userInfo?.paypalId ?? 'N/A' })
  } catch (error) {
    logger.error(`Error retrieving user paypal ID ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve user paypal ID',
    })
  }
}

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  try {
    const userId = user?.userId
    const { session_id } = await req.json()
    if (!session_id) {
      return NextResponse.json({
        success: false,
        message: 'No session ID provided',
      })
    }
    const userInfo = await redis.get(session_id)
    if (!userInfo) {
      return NextResponse.json({
        success: false,
        message: 'User information not found',
      })
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        paypalId: JSON.parse(userInfo).email,
      },
    })

    logger.info(`Updated paypal ID for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Successfully updated paypal ID',
    })
  } catch (error) {
    logger.error(`Error updating user paypal ID ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Failed to update user paypal ID',
    })
  }
}
