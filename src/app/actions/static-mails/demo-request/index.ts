'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

interface DemoRequestData {
  Email: string
  Name: string
  [key: string]: string
}

export async function sendDemoRequestEmail(formData: DemoRequestData) {
  try {
    const innerHtml = Object.entries(formData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('<br/>')

    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const templateData = {
      innerHtml,
    }

    console.log('templateData', templateData)

    const ses = getAWSSesInstance()
    await ses.sendMail('DEMO_REQUEST', emailData, templateData)

    return {
      success: true,
      message: templateData.innerHtml,
    }
  } catch (error) {
    logger.error('Error sending demo request email', error)
    return {
      success: false,
      message: 'Error sending demo request email',
    }
  }
}
