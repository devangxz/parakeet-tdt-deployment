export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'

export async function GET() {
  try {
    const redirectUri = encodeURIComponent(
      `${process.env.BACKEND_URL}/api/public/paypal/callback`
    )
    const paypalAuthUrl = `${process.env.PAYPAL_OPENID_ENDPOINT}/webapps/auth/protocol/openidconnect/v1/authorize?client_id=${process.env.PAYPAL_CLIENT_ID}&response_type=code&scope=openid profile email&redirect_uri=${redirectUri}`

    return NextResponse.json({
      success: true,
      url: paypalAuthUrl,
    })
  } catch (error) {
    logger.error(`Error during PayPal login url creation ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Failed to log in with PayPal',
    })
  }
}
