import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export function generateState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

const DROPBOX_CLIENT_ID = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function GET() {
    const state = generateState()
    const cookieStore = cookies()

    cookieStore.set('dropboxAuthState', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 10 // 10 minutes
    })

    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize')
    authUrl.searchParams.append('client_id', DROPBOX_CLIENT_ID)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('redirect_uri', `${SITE_URL}/auth/dropbox/callback`)
    authUrl.searchParams.append('state', state)
    authUrl.searchParams.append('token_access_type', 'offline')

    return NextResponse.redirect(authUrl.toString())
}