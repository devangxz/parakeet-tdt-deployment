import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

import { getRedirectPathByRole } from '@/utils/roleRedirect'

import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const requestedUrl = req.nextUrl.pathname

  if (
    requestedUrl.startsWith('/api') &&
    !requestedUrl.startsWith('/api/auth')
  ) {
    const apiKey = req.headers.get('x-api-key')

    if (apiKey) {
      // TODO:Validate API key by checking against the database and adding the user to the request
      // const user = await prisma.user.findUnique({
      //   where: { apiKey },
      // })
      // if (user) {
      //   req.user = user
      //   return NextResponse.next()
      // }
      // } else {
      //   return NextResponse.json(
      //     { message: 'Invalid API key' },
      //     { status: 401 }
      //   )
      // }
    }

    // If no API key, check for JWT session using NextAuth
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Attach the user object to the request
    req = Object.assign(req, { user: token })

    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.redirect(new URL('/signin', req.url))
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
    // Apply middleware to all API routes except the ones you want to exclude
    // '/api/(?!excluded-route|another-excluded-route)(.*)',
    '/files/:path*',
    '/payments/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/dev/:path*',
    '/transcribe/:path*',
    '/api/:path*',
  ],
}
