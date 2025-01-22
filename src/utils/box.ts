export async function uploadToBox(fileUrl: string, fileName: string, token: string) {
    try {
        // Get upload URL and token
        const urlResponse = await fetch('/api/box', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileUrl,
                fileName,
                token
            }),
        })

        if (!urlResponse.ok) {
            const errorData = await urlResponse.json()
            throw new Error(errorData.error || 'Failed to upload file')
        }

        return await urlResponse.json()
    } catch (error) {
        console.error('Upload error:', error)
        throw error
    }
}