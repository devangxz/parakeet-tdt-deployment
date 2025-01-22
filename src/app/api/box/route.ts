import axios from 'axios'
import FormData from 'form-data'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { fileUrl, fileName, token } = await req.json()

        if (!fileUrl || !fileName || !token) {
            return NextResponse.json(
                { error: 'File URL, name and token are required' },
                { status: 400 }
            )
        }

        // Decode the JWT token to get the Box access token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY!) as {
            boxAccessToken: string
        }

        if (!decodedToken.boxAccessToken) {
            return NextResponse.json(
                { error: 'Invalid token format' },
                { status: 401 }
            )
        }

        // Download file from URL
        const fileResponse = await axios.get(fileUrl, {
            responseType: 'arraybuffer'
        })

        // Create form data
        const boxFormData = new FormData()

        // Add the attributes
        boxFormData.append('attributes', JSON.stringify({
            name: fileName,
            parent: { id: '0' }
        }))

        // Add the file content
        boxFormData.append('file', Buffer.from(fileResponse.data), {
            filename: fileName,
            contentType: fileResponse.headers['content-type'] || 'application/octet-stream'
        })

        // Upload to Box using the decoded access token
        const uploadResponse = await axios.post(
            'https://upload.box.com/api/2.0/files/content',
            boxFormData,
            {
                headers: {
                    'Authorization': `Bearer ${decodedToken.boxAccessToken}`,
                    ...boxFormData.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        )

        return NextResponse.json(uploadResponse.data)
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Box API Error Response:', error.response?.data)
            return NextResponse.json(
                {
                    error: error.response?.data?.message || 'Failed to upload file',
                    details: error.response?.headers?.['www-authenticate']
                },
                { status: error.response?.status || 500 }
            )
        }
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}