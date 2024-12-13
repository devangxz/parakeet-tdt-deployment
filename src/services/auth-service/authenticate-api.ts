import { getToken } from 'next-auth/jwt'

import { authenticateApiKey } from '@/services/rest-api/authenticate'

import type { NextRequest } from 'next/server'

export async function authenticateRequest(req: NextRequest) {
  // Check for JWT token in headers
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (token) {
    return token
  }

  // Check for Basic auth
  const authHeader = req.headers.get('authorization')
  const auth = authHeader?.split(' ')
  const apiKey = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

  // Authenticate API key
  const user = await authenticateApiKey(apiKey)
  if (user) {
    return user
  }

  return null
}
