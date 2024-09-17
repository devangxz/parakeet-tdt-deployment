import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

import { getRedirectPathByRole } from '@/utils/roleRedirect'

import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.redirect(new URL('/api/auth/signin', req.url))
  }

  const isCustomer = token.role === 'CUSTOMER'
  const isAdmin = token.role === 'ADMIN'
  const isReviewer = token.role === 'REVIEWER'

  const url = req.nextUrl.pathname

  if (url.startsWith('/files') || url.startsWith('/payments')) {
    if (!isCustomer && !isAdmin) {
      const redirectUrl = getRedirectPathByRole(token.role as string)
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }
  }

  if (url.startsWith('/admin')) {
    if (!isAdmin) {
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
  ],
}
