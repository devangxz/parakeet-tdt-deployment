'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function updateMailTemplate(mailId: string) {
  logger.info(`--> test:updateMailTemplate`)

  try {
    const awsSes = getAWSSesInstance()
    const message = await awsSes.updateTemplate(mailId)
    logger.info(`<-- test:updateMailTemplate`)
    return { success: true, message }
  } catch (error) {
    logger.error(`updateMailTemplate Failed: ${String(error)}`)
    return {
      success: false,
      message: 'updateMailTemplate Failed',
    }
  }
}
