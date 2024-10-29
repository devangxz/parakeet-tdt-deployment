export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import gateway from '@/lib/braintree'

export async function GET() {
  try {
    const response = await gateway.clientToken.generate({})
    const clientToken = response.clientToken

    return NextResponse.json({ clientToken }, { status: 200 })
  } catch (error) {
    console.error('Error generating client token:', error)
    return NextResponse.json(
      { error: 'Failed to generate client token' },
      { status: 500 }
    )
  }
}
