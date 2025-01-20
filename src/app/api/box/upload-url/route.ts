import axios from 'axios'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const BOX_API_URL = 'https://api.box.com/2.0'

export async function POST(req: Request) {
    try {
        const { fileName } = await req.json()
        const cookieStore = cookies()
        const accessToken = cookieStore.get('boxAccessToken')?.value

        if (!accessToken) {
            return NextResponse.json(
                { error: 'No access token found' },
                { status: 401 }
            )
        }

        // First, get or create a folder for uploads
        const folderResponse = await axios.get(
            `${BOX_API_URL}/folders/0`, // Root folder
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        )

        const folderId = folderResponse.data.id

        // Get upload URL for the file
        const uploadUrlResponse = await axios.post(
            `${BOX_API_URL}/files/content`,
            {
                attributes: {
                    name: fileName,
                    parent: { id: folderId }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        return NextResponse.json({
            uploadUrl: uploadUrlResponse.data.upload_url,
            folderId
        })
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error('Box upload URL error:', error.response?.data)

            if (error.response?.status === 401) {
                return NextResponse.json(
                    { error: 'Authentication failed' },
                    { status: 401 }
                )
            }

            return NextResponse.json(
                { error: 'Failed to get upload URL' },
                { status: error.response?.status || 500 }
            )
        }

        console.error('Box upload URL error:', error)
        return NextResponse.json(
            { error: 'Failed to get upload URL' },
            { status: 500 }
        )
    }
}