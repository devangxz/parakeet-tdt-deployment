import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

import { getRedirectPathByRole } from '@/utils/roleRedirect'

import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const requestedUrl = req.nextUrl.pathname

  // Skip middleware for /api/auth* and /api/webhook*
  if (
    requestedUrl.startsWith('/api/auth') ||
    requestedUrl.startsWith('/api/webhook') ||
    requestedUrl.startsWith('/api/static-mails') ||
    requestedUrl.startsWith('/api/public')
  ) {
    return NextResponse.next()
  }

  if (requestedUrl.startsWith('/api')) {
    const apiKey = req.headers.get('x-api-key')

    if (apiKey && apiKey === process.env.SCRIBIE_API_KEY) {
      return NextResponse.next()
    }

    // If no API key, check for JWT session using NextAuth
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const response = NextResponse.next()
    response.headers.set('x-user-token', JSON.stringify(token))

    return response
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  const isCustomer = token.role === 'CUSTOMER'
  const isAdmin = token.role === 'ADMIN'
  const isReviewer = token.role === 'REVIEWER'
  const isOm = token.role === 'OM'

  const url = req.nextUrl.pathname

  if (url.startsWith('/files') || url.startsWith('/payments')) {
    if (!isCustomer && !isAdmin) {
      const redirectUrl = getRedirectPathByRole(token.role as string)
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  if (url.startsWith('/admin')) {
    if (!isAdmin && !isOm) {
      const redirectUrl = getRedirectPathByRole(token.role as string)
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  if (url.startsWith('/dev')) {
    if (!isAdmin) {
      const redirectUrl = getRedirectPathByRole(token.role as string)
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  if (url.startsWith('/transcribe/legal-cf-reviewer')) {
    if (!isReviewer || !token.reviewEnabled) {
      const redirectUrl = getRedirectPathByRole(token.role as string)
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  if (url.startsWith('/transcribe/legal-qc')) {
    if (!token.legalEnabled) {
      const redirectUrl = getRedirectPathByRole(token.role as string)
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/files/:path*',
    '/payments/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/dev/:path*',
    '/transcribe/:path*',
    '/api/:path*',
  ],
}
