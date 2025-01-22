import axios from 'axios'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { fileUrl, uploadUrl, accessToken } = await req.json()

        // Download file from signed URL
        const fileResponse = await axios.get(fileUrl, {
            responseType: 'arraybuffer'
        })

        // Upload to Box
        const uploadResponse = await axios.post(uploadUrl, fileResponse.data, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Authorization': `Bearer ${accessToken}`,
                'Content-Length': fileResponse.data.length
            }
        })

        return NextResponse.json(uploadResponse.data)
    } catch (error) {
        console.error('Box upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}