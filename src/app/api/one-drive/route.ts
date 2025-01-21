import axios from 'axios'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'

export async function POST(req: Request) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { fileUrl, fileName, accessToken } = await req.json()

        if (!fileUrl || !fileName || !accessToken) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            )
        }

        // Download file from signed URL
        const fileResponse = await axios.get(fileUrl, {
            responseType: 'arraybuffer'
        })

        // Create upload session for OneDrive
        const createSessionResponse = await axios.post(
            'https://graph.microsoft.com/v1.0/me/drive/root:/Documents/' + fileName + ':/createUploadSession',
            {},
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        const { uploadUrl } = createSessionResponse.data

        // Upload file using the session URL
        const uploadResponse = await axios.put(
            uploadUrl,
            fileResponse.data,
            {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': fileResponse.data.length
                }
            }
        )

        return NextResponse.json(uploadResponse.data)
    } catch (error) {
        console.error('Error uploading file to OneDrive:', error)

        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}