'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

interface ContactFormData {
  Email: string
  Name: string
  Subject?: string
  QueryType?: string
  Phone?: string
  Message?: string
  [key: string]: string | undefined
}

export async function sendContactEmail(formData: ContactFormData) {
  try {
    console.log('formData', formData)

    const orderedFields = [
      'Name',
      'Email',
      'Subject',
      'QueryType',
      'Phone',
      'Message',
    ]
    const innerHtml = orderedFields
      .filter((field) => formData[field] !== undefined)
      .map((field) => `${field}: ${formData[field]}`)
      .join('<br/>')

    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const templateData = {
      innerHtml,
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
