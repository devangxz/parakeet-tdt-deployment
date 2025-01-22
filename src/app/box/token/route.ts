import axios from 'axios'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BOX_CLIENT_ID = process.env.NEXT_PUBLIC_BOX_CLIENT_ID!
const BOX_CLIENT_SECRET = process.env.BOX_CLIENT_SECRET!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function POST(req: Request) {
    try {
        const { code, state } = await req.json()
        const cookieStore = cookies()
        const savedState = cookieStore.get('boxAuthState')?.value

        if (!code || !state || state !== savedState) {
            return NextResponse.json(
                { error: 'Invalid state parameter' },
                { status: 400 }
            )
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(
            'https://api.box.com/oauth2/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: BOX_CLIENT_ID,
                client_secret: BOX_CLIENT_SECRET,
                redirect_uri: `${SITE_URL}/auth/box/callback`
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        )

        const { access_token, refresh_token } = tokenResponse.data

        if (!access_token) {
            return NextResponse.json(
                { error: 'No access token received' },
                { status: 400 }
            )
        }

        // Create response with tokens in cookies
        const response = NextResponse.json({ success: true })

        // Set access token cookie
        response.cookies.set('boxAccessToken', access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 // 1 hour
        })

        // Set refresh token cookie if available
        if (refresh_token) {
            response.cookies.set('boxRefreshToken', refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 // 30 days
            })
        }

        return response
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Box token exchange error:', error.message)
        } else if (axios.isAxiosError(error)) {
            console.error('Box token exchange error:', error.response?.data)
            return NextResponse.json(
                { error: 'Failed to exchange token' },
                { status: error.response?.status || 500 }
            )
        } else {
            console.error('Box token exchange error:', String(error))
        }

        return NextResponse.json(
            { error: 'Failed to exchange token' },
            { status: 500 }
        )
    }
}

// GET endpoint to check for existing token
export async function GET() {
    const cookieStore = cookies()
    const accessToken = cookieStore.get('boxAccessToken')?.value

    if (!accessToken) {
        return NextResponse.json(
            { error: 'No token found' },
            { status: 401 }
        )
    }

    return NextResponse.json({ token: accessToken })
}