import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST(request: Request) {
  logger.info(`--> test:createMailTemplate`)

  const { mailId } = await request.json()

  try {
    const awsSes = getAWSSesInstance()
    const message = await awsSes.createTemplate(mailId)
    logger.info(`<-- test:createMailTemplate`)
    return NextResponse.json({ success: true, message: message })
  } catch (error) {
    logger.error(`createMailTemplate Failed: ${String(error)}`)
    return NextResponse.json({
      success: false,
      error: 'createMailTemplate Failed',
    })
  }
}
