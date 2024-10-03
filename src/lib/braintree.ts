import braintree from 'braintree'

const gateway = new braintree.BraintreeGateway({
  environment:
    process.env.SCB_ENVIRONMENT === 'PROD'
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID as string,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY as string,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY as string,
})

export default gateway
