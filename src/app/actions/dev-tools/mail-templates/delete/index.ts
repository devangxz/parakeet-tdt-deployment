'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function deleteMailTemplate(mailId: string) {
  try {
    logger.info(`--> test:deleteMailTemplate`)

    if (!mailId) {
      return {
        success: false,
        message: 'Mail ID is required',
      }
    }

    const awsSes = getAWSSesInstance()
    const message = await awsSes.deleteTemplate(mailId)

    logger.info(`<-- test:deleteMailTemplate`)
    return {
      success: true,
      message: message,
    }
  } catch (error) {
    logger.error(`deleteMailTemplate Failed: ${String(error)}`)
    return {
      success: false,
      message: 'deleteMailTemplate Failed',
    }
  }
}
