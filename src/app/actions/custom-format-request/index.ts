'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

interface CustomFormatRequestPayload {
  customerEmail: string
  customFormatRequest: string
}

export async function sendCustomFormatRequest(
  payload: CustomFormatRequestPayload
) {
  const { customerEmail, customFormatRequest } = payload

  if (!customerEmail.trim() || !customFormatRequest.trim()) {
    logger.error(`Invalid payload ${payload}`)
    return false
  }

  try {
    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const templateData = {
      customerEmail: customerEmail.trim(),
      customFormatRequest: customFormatRequest.trim(),
    }

    const ses = getAWSSesInstance()

    await ses.sendMail('CUSTOM_FORMAT_REQUEST', emailData, templateData)

    return true
  } catch (error) {
    logger.error(`Failed to send custom format request email ${error}`)
    return false
  }
}
