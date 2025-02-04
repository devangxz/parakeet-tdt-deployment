export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { generateUniqueId } from '@/utils/generateUniqueId'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user?.internalTeamUserId || user?.userId

    const api = await prisma.apiKey.findUnique({
      where: { userId },
    })

    return NextResponse.json({
      success: true,
      data: api
        ? { apiKey: api.apiKey, webhook: api.webhook, ts: api.createdAt }
        : null,
    })
  } catch (error) {
    logger.error('Error fetching api keys:', error)
    return NextResponse.json(
      { message: 'Failed to fetch user api keys' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      )
    }

    const userId = user?.internalTeamUserId || user?.userId

    const newApiKey = generateUniqueId()

    await prisma.apiKey.upsert({
      where: { userId: userId },
      update: { apiKey: newApiKey },
      create: { userId: userId, apiKey: newApiKey },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully updated api key',
    })
  } catch (err) {
    logger.error(`Error regenerating api key: ${err}`)
    return NextResponse.json(
      { message: 'Failed to regenerate api key' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      )
    }

    const userId = user?.internalTeamUserId || user?.userId

    await prisma.apiKey.update({
      where: { userId },
      data: { apiKey: '', webhook: '' },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully removed api key',
    })
  } catch (err) {
    logger.error(`Error removing api key: ${err}`)
    return NextResponse.json(
      { message: 'Failed to remove api key' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      )
    }

    const userId = user?.internalTeamUserId || user?.userId

    const { webhook } = await req.json()

    await prisma.apiKey.update({
      where: { userId },
      data: { webhook },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully updated webhook',
    })
  } catch (err) {
    logger.error(`Error updating webhook: ${err}`)
    return NextResponse.json(
      { message: 'Failed to update webhook' },
      { status: 500 }
    )
  }
}
