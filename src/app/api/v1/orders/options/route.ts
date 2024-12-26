import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const defaultOptions = await prisma.defaultOption.findUnique({
      where: { userId: user.userId },
    })

    if (!defaultOptions) {
      return NextResponse.json({})
    }

    const options = JSON.parse(defaultOptions.options ?? '{}')
    logger.info(`Retrieved order options for user ${user.userId}`)

    return NextResponse.json(options)
  } catch (error) {
    logger.error(`Failed to get order options: ${error}`)
    return NextResponse.json(
      { message: 'Failed to get order options' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const options = await req.json()
    if (!options || typeof options !== 'object') {
      return NextResponse.json({ message: 'Invalid options' }, { status: 400 })
    }

    const optionsString = JSON.stringify(options)
    await prisma.defaultOption.upsert({
      where: { userId: user.userId },
      update: { options: optionsString },
      create: { userId: user.userId, options: optionsString },
    })

    return NextResponse.json({
      message: 'Successfully saved order options',
    })
  } catch (err) {
    logger.error(`Error handling order options: ${err}`)
    return NextResponse.json(
      {
        message: 'Failed to save order options',
      },
      { status: 500 }
    )
  }
}
