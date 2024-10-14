import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { instructions } = await req.json()
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  if (!instructions) {
    return NextResponse.json(
      { message: 'Invalid instructions' },
      { status: 400 }
    )
  }

  logger.info('--> defaultOrderInstructions')
  try {
    const instructionsString = instructions
    await prisma.defaultInstruction.upsert({
      where: { userId: user?.userId },
      update: { instructions: instructionsString },
      create: { userId: user?.userId, instructions: instructionsString },
    })
    return NextResponse.json({
      message: 'SCB_DEFAULT_ORDER_INSTRUCTIONS_SUCCESS',
      statusCode: 200,
    })
  } catch (err) {
    logger.error(`Error handling default order instructions: ${err}`)
    return NextResponse.json({
      message: 'SCB_DEFAULT_ORDER_INSTRUCTIONS_SAVE_FAILED',
      statusCode: 500,
    })
  }
}
