'use server'

import logger from '@/lib/logger'

export async function getAuthUrl() {
  try {
    const redirectUri = encodeURIComponent(
      `${process.env.NEXTAUTH_URL}/paypal/callback`
    )
    const paypalAuthUrl = `${process.env.PAYPAL_OPENID_ENDPOINT}/webapps/auth/protocol/openidconnect/v1/authorize?client_id=${process.env.PAYPAL_CLIENT_ID}&response_type=code&scope=openid profile email&redirect_uri=${redirectUri}`

    return {
      success: true,
      url: paypalAuthUrl,
    }
  } catch (error) {
    logger.error(`Error during PayPal login url creation ${error}`)
    return {
      success: false,
      message: 'Failed to log in with PayPal',
    }
  }
}
