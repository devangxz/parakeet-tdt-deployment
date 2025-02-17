export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import getDefaultOptions from '@/services/user-service/get-order-options'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user?.internalTeamUserId || user?.userId

    const response = await getDefaultOptions(userId as number)

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { message: 'Failed to fetch user preferences' },
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

    const options = await req.json()

    if (!options || typeof options !== 'object') {
      return NextResponse.json(
        { message: 'options are required' },
        { status: 400 }
      )
    }

    const optionsString = JSON.stringify(options)

    await prisma.defaultOption.upsert({
      where: { userId },
      update: { options: optionsString },
      create: { userId, options: optionsString },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully updated order options',
    })
  } catch (err) {
    logger.error(`Error handling default order options: ${err}`)
    return NextResponse.json(
      { message: 'Failed to update options' },
      { status: 500 }
    )
  }
}
