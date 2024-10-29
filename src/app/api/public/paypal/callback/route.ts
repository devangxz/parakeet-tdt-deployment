export const dynamic = 'force-dynamic'
import axios from 'axios'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

import logger from '@/lib/logger'
import { redis } from '@/lib/redis'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  try {
    if (!code) {
      return NextResponse.json({ success: false, message: 'No code provided' })
    }
    const redirectUri = `${process.env.BACKEND_URL}/api/public/paypal/callback`
    const tokenResponse = await axios.post(
      process.env.PAYPAL_TOKEN_URL ?? '',
      null,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        params: {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        },
      }
    )

    const { access_token } = tokenResponse.data

    const userInfoResponse = await axios.get(
      process.env.PAYPAL_USERINFO_URL ?? '',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )

    const userInfo = userInfoResponse.data
    const sessionId = uuidv4()
    await redis.set(sessionId, JSON.stringify(userInfo), 'EX', 3600)
    return NextResponse.redirect(
      `${process.env.FRONTEND_URL}/settings/paypal-account?session_id=${sessionId}`
    )
  } catch (error) {
    logger.error(`Error during PayPal callback ${error}`)
    return NextResponse.json({
      success: false,
      message: 'Failed to log in with PayPal',
    })
  }
}
