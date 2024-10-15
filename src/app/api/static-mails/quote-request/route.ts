import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST(req: NextRequest) {
  const params: string[] = []
  const { Email, Name, options } = await req.json()
  try {
    options.forEach((option: Record<string, boolean>) => {
      for (const [key, value] of Object.entries(option)) {
        if (value === true) {
          params.push(`${key}: ${value ? '1' : '0'}`)
        }
      }
    })

    const emailData = {
      userEmailId: Email,
    }
    const templateData = {
      innerHtml: `${params.join('<br/>')}`,
      Name,
    }
    const ses = getAWSSesInstance()
    await ses.sendMail('QUOTE_REQUEST', emailData, templateData)
    return NextResponse.json({ Success: templateData.innerHtml })
  } catch (err) {
    logger.error('Error sending quote request email', err)
    return NextResponse.json(
      { Success: 'Error sending quote request email' },
      { status: 500 }
    )
  }
}
