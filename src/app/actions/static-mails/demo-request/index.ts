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
    const params: string[] = []
    Object.keys(formData).forEach((key) => {
      params.push(`${key}: ${formData[key]}`)
    })

    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const templateData = {
      innerHtml: `${params.join('<br/>')}`,
      Name: formData.Name,
    }

    const ses = getAWSSesInstance()
    await ses.sendMail('DEMO_REQUEST', emailData, templateData)

    return {
      success: true,
      message: templateData.innerHtml,
    }
  } catch (err) {
    logger.error('Error sending demo request email', err)
    return {
      success: false,
      message: 'Error sending demo request email',
    }
  }
}
