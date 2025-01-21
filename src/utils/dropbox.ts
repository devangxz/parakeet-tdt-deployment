export async function uploadToDropbox(
    fileUrl: string,
    fileName: string,
    accessToken: string
) {
    try {
        // First check if we need to start an upload session (for files > 150MB)
        const response = await fetch('/api/dropbox/upload', {
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

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.message || 'Upload failed')
        }

        return await response.json()
    } catch (error) {
        console.error('Dropbox upload error:', error)
        throw error
    }
}