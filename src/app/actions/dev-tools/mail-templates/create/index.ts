'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function createMailTemplate(mailId: string) {
  try {
    logger.info(`--> test:createMailTemplate`)

    if (!mailId) {
      return {
        success: false,
        message: 'Mail ID is required',
      }
    }

    const awsSes = getAWSSesInstance()
    const message = await awsSes.createTemplate(mailId)

    logger.info(`<-- test:createMailTemplate`)
    return {
      success: true,
      message: message,
    }
  } catch (error) {
    logger.error(`createMailTemplate Failed: ${String(error)}`)
    return {
      success: false,
      message: 'createMailTemplate Failed',
    }
  }
}
