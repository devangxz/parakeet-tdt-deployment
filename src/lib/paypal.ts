import paypal from '@paypal/payouts-sdk'

const environment = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID || 'PAYPAL-SANDBOX-CLIENT-ID'
  const clientSecret =
    process.env.PAYPAL_CLIENT_SECRET || 'PAYPAL-SANDBOX-CLIENT-SECRET'
  if (process.env.SCB_ENVIRONMENT === 'PROD') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret)
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret)
}

const paypalClient = new paypal.core.PayPalHttpClient(environment())

export default paypalClient
