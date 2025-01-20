import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { fileUrl, fileName, accessToken } = await request.json()

        if (!accessToken) {
            return NextResponse.json(
                { error: 'No access token provided' },
                { status: 401 }
            )
        }

        // Fetch the file
        const fileResponse = await fetch(fileUrl)
        if (!fileResponse.ok) {
            return NextResponse.json(
                { error: `Failed to fetch file: ${fileResponse.statusText}` },
                { status: 500 }
            )
        }
        const fileBlob = await fileResponse.blob()

        // Create form data
        const formData = new FormData()
        formData.append(
            'metadata',
            new Blob(
                [
                    JSON.stringify({
                        name: fileName,
                        mimeType: fileBlob.type,
                    }),
                ],
                { type: 'application/json' }
            )
        )
        formData.append('file', fileBlob)

        // Upload to Google Drive through the server
        const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    // Add required headers
                    'Accept': 'application/json',
                },
                body: formData,
            }
        )

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            console.error('Google Drive API Error:', {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                error: errorText
            })
            return NextResponse.json(
                {
                    error: 'Upload failed',
                    details: errorText,
                    status: uploadResponse.status
                },
                { status: uploadResponse.status }
            )
        }

        const result = await uploadResponse.json()
        return NextResponse.json(result)
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { error: 'Failed to upload file', details: error },
            { status: 500 }
        )
    }
}