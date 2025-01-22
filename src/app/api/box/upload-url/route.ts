import axios from 'axios'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BOX_API_URL = 'https://upload.box.com/api/2.0'  // Changed to upload API URL

export async function POST() {
    try {
        const cookieStore = cookies()
        const accessToken = cookieStore.get('boxAccessToken')?.value

        if (!accessToken) {
            return NextResponse.json(
                { error: 'No access token found' },
                { status: 401 }
            )
        }

        const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET_KEY!) as {
            boxAccessToken: string
        }

        // For small files, we'll use the simple upload endpoint
        return NextResponse.json({
            uploadUrl: `${BOX_API_URL}/files/content`,
            accessToken: decodedToken.boxAccessToken
        })
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error('Box API Error Response:', error.response?.data)
            if (error.response?.status === 401) {
                return NextResponse.json(
                    { error: 'Authentication failed' },
                    { status: 401 }
                )
            }

            return NextResponse.json(
                { error: error.response?.data?.message || 'Failed to get upload URL' },
                { status: error.response?.status || 500 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to get upload URL' },
            { status: 500 }
        )
    }
}