import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST(request: Request) {
  logger.info(`--> test:deleteMailTemplate`)

  const { mailId } = await request.json()

  try {
    const awsSes = getAWSSesInstance()
    const message = await awsSes.deleteTemplate(mailId)
    logger.info(`<-- test:deleteMailTemplate`)
    return NextResponse.json({ success: true, message: message })
  } catch (error) {
    logger.error(`deleteMailTemplate Failed: ${String(error)}`)
    return NextResponse.json({
      success: false,
      error: 'deleteMailTemplate Failed',
    })
  }
}
