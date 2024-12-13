/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

interface QuoteRequestData {
  UserEmail: string
  Name: string
  options: any
}

export async function sendQuoteRequestEmail(formData: QuoteRequestData) {
  try {
    const params: string[] = []
    formData.options.forEach((option: any) => {
      for (const [key, value] of Object.entries(option)) {
        if (value === true) {
          params.push(`${key}: ${value ? '1' : '0'}`)
        }
      }
    })

    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const templateData = {
      innerHtml: `${params.join('<br/>')}`,
      Name: formData.Name,
    }

    const ses = getAWSSesInstance()
    await ses.sendMail('QUOTE_REQUEST', emailData, templateData)

    return {
      success: true,
      message: templateData.innerHtml,
    }
  } catch (err) {
    logger.error('Error sending quote request email', err)
    return {
      success: false,
      message: 'Error sending quote request email',
    }
  }
}
