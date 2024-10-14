import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { options } = await req.json()
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  if (!options || typeof options !== 'object') {
    return NextResponse.json({ message: 'Invalid options' }, { status: 400 })
  }

  logger.info('--> defaultOrderOptions')
  try {
    const optionsString = JSON.stringify(options)
    await prisma.defaultOption.upsert({
      where: { userId: user?.userId },
      update: { options: optionsString },
      create: { userId: user?.userId, options: optionsString },
    })
    return NextResponse.json({
      message: 'SCB_DEFAULT_ORDER_OPTIONS_SUCCESS',
      statusCode: 200,
    })
  } catch (err) {
    logger.error(`Error handling default order options: ${err}`)
    return NextResponse.json({
      message: 'SCB_DEFAULT_ORDER_OPTIONS_FAILED',
      statusCode: 500,
    })
  }
}
