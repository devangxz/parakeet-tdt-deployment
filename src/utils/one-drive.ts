export async function uploadToOneDrive(
    fileUrl: string,
    fileName: string,
    accessToken: string
) {
    try {
        if (!accessToken) {
            throw new Error('No access token available')
        }

        // Upload through server proxy to handle CORS
        const response = await fetch('/api/one-drive/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrl,
                fileName,
                accessToken,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            throw new Error(data.error || 'Failed to upload file')
        }

        return data
    } catch (error) {
        console.error('Upload error:', error)
        if (error instanceof Error &&
            (error.message.includes('401') || error.message.includes('403'))) {
            throw new Error('Please authenticate with OneDrive')
        }
        throw error
    }
}