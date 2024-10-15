import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST(request: Request) {
  logger.info(`--> test:updateMailTemplate`)

  const { mailId } = await request.json()

  try {
    const awsSes = getAWSSesInstance()
    const message = await awsSes.updateTemplate(mailId)
    logger.info(`<-- test:updateMailTemplate`)
    return NextResponse.json({ success: true, message: message })
  } catch (error) {
    logger.error(`updateMailTemplate Failed: ${String(error)}`)
    return NextResponse.json({
      success: false,
      error: 'updateMailTemplate Failed',
    })
  }
}
