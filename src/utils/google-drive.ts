export async function uploadToGoogleDrive(
    fileUrl: string,
    fileName: string,
    accessToken: string
) {
    try {
        // Verify we have a valid token
        if (!accessToken) {
            throw new Error('No access token available')
        }

        const response = await fetch('/api/google-drive', {
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
            throw new Error(data.details || data.error || 'Failed to upload file')
        }

        return data
    } catch (error: unknown) {
        console.error('Upload error:', error)
        // If token expired, trigger new login
        if (error instanceof Error &&
            (error.message.includes('401') || error.message.includes('403'))) {
            // Clear the stored token
            localStorage.removeItem('gdrive_token')
            throw new Error('Please login to Google Drive again')
        }
        throw error
    }
}