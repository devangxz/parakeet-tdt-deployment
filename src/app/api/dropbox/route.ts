import axios from 'axios'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { fileUrl, fileName, accessToken } = await req.json()

        // Download file from signed URL
        const fileResponse = await axios.get(fileUrl, {
            responseType: 'arraybuffer'
        })

        const fileSize = fileResponse.data.length

        if (fileSize <= 150 * 1024 * 1024) { // Less than 150MB
            // Use simple upload
            const uploadResponse = await axios.post(
                'https://content.dropboxapi.com/2/files/upload',
                fileResponse.data,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Dropbox-API-Arg': JSON.stringify({
                            path: `/${fileName}`,
                            mode: 'add',
                            autorename: true,
                            mute: false,
                        }),
                        'Content-Type': 'application/octet-stream'
                    }
                }
            )

            return NextResponse.json(uploadResponse.data)
        } else {
            // Start upload session for larger files
            const sessionResponse = await axios.post(
                'https://content.dropboxapi.com/2/files/upload_session/start',
                fileResponse.data.slice(0, 50 * 1024 * 1024), // First 50MB chunk
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Dropbox-API-Arg': JSON.stringify({
                            close: false
                        }),
                        'Content-Type': 'application/octet-stream'
                    }
                }
            )

            const { session_id } = sessionResponse.data

            // Upload remaining chunks
            let offset = 50 * 1024 * 1024
            while (offset < fileSize) {
                const chunk = fileResponse.data.slice(
                    offset,
                    Math.min(offset + 50 * 1024 * 1024, fileSize)
                )

                await axios.post(
                    'https://content.dropboxapi.com/2/files/upload_session/append_v2',
                    chunk,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Dropbox-API-Arg': JSON.stringify({
                                cursor: {
                                    session_id,
                                    offset
                                },
                                close: offset + chunk.length >= fileSize
                            }),
                            'Content-Type': 'application/octet-stream'
                        }
                    }
                )

                offset += chunk.length
            }

            // Finish upload
            const finishResponse = await axios.post(
                'https://content.dropboxapi.com/2/files/upload_session/finish',
                '',
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Dropbox-API-Arg': JSON.stringify({
                            cursor: {
                                session_id,
                                offset: fileSize
                            },
                            commit: {
                                path: `/${fileName}`,
                                mode: 'add',
                                autorename: true,
                                mute: false
                            }
                        }),
                        'Content-Type': 'application/octet-stream'
                    }
                }
            )

            return NextResponse.json(finishResponse.data)
        }
    } catch (error) {
        console.error('Dropbox upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}