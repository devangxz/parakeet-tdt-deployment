export async function uploadToBox(
    fileUrl: string,
    fileName: string,
    accessToken: string
) {
    try {
        // First get an upload URL from Box
        const uploadUrlResponse = await fetch('/api/box/upload-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ fileName }),
        })

        if (!uploadUrlResponse.ok) {
            throw new Error('Failed to get upload URL')
        }

        const { uploadUrl, folderId } = await uploadUrlResponse.json()

        // Upload the file through our proxy to handle CORS
        const uploadResponse = await fetch('/api/box/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrl,
                fileName,
                uploadUrl,
                folderId,
                accessToken,
            }),
        })

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file')
        }

        return await uploadResponse.json()
    } catch (error) {
        console.error('Box upload error:', error)
        throw error
    }
}