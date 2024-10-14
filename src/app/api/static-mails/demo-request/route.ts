import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import { getAWSSesInstance } from '@/lib/ses'

export async function POST(req: NextRequest) {
  const params: string[] = []
  const { Email, Name } = await req.json()
  const body = await req.json()
  try {
    Object.keys(body).forEach((key) => {
      params.push(`${key}: ${body[key]}`)
    })
    const emailData = {
      userEmailId: Email,
    }
    const templateData = {
      innerHtml: `${params.join('<br/>')}`,
      Name,
    }
    const ses = getAWSSesInstance()
    await ses.sendMail('DEMO_REQUEST', emailData, templateData)
    return NextResponse.json({ Success: templateData.innerHtml })
  } catch (err) {
    logger.error('Error sending demo request email', err)
    return NextResponse.json(
      { Success: 'Error sending demo request email' },
      { status: 500 }
    )
  }
}
