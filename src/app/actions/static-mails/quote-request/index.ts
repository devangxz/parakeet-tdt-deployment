'use server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

interface QuoteRequestData {
  Name: string
  UserEmail: string
  Phone: string
  Duration: number
  message: string
  options: Array<
    Partial<
      Record<
        | 'Strict Verbatim'
        | 'Accented Speakers'
        | 'Noisy Audio'
        | 'Srt Vtt'
        | 'Custom Formatting'
        | 'Recurring Orders',
        boolean
      >
    >
  >
}

export async function sendQuoteRequestEmail(formData: QuoteRequestData) {
  try {
    const optionParams: string[] = []
    formData.options.forEach((option) => {
      Object.entries(option).forEach(([key, value]) => {
        optionParams.push(`${key}: ${value ? '1' : '0'}`)
      })
    })

    const emailData = {
      userEmailId: 'support@scribie.com',
    }

    const innerHtml =
      `Name: ${formData.Name}<br/>` +
      `Email: ${formData.UserEmail}<br/>` +
      `Phone: ${formData.Phone}<br/>` +
      `Duration: ${formData.Duration}<br/>` +
      `Message: ${formData.message}<br/>` +
      `Options:<br/>${optionParams.join('<br/>')}`

    const templateData = {
      innerHtml,
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
