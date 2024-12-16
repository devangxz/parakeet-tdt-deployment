'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

interface ContactFormData {
  Email: string
  Name: string
  [key: string]: string
}

export async function sendContactEmail(formData: ContactFormData) {
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
    await ses.sendMail('CONTACT', emailData, templateData)

    return {
      success: true,
      message: templateData.innerHtml,
    }
  } catch (err) {
    logger.error('Error sending contact email', err)
    return {
      success: false,
      message: 'Error sending contact email',
    }
  }
}
