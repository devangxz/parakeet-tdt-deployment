import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadToOneDrive } from '@/utils/one-drive'

interface OneDriveUploadButtonProps {
    fileUrl: string
    fileName: string
}

export default function OneDriveUploadButton({ fileUrl, fileName }: OneDriveUploadButtonProps) {
    const [isUploading, setIsUploading] = useState(false)

    const handleUpload = async () => {
        setIsUploading(true)
        const toastId = toast.loading('Uploading to OneDrive...')

        try {
            // Get token from cookie
            const tokenResponse = await fetch('/auth/one-drive/token')
            let token = tokenResponse.ok ? (await tokenResponse.json()).token : null

            if (!token) {
                // Try refreshing token
                const refreshResponse = await fetch('/auth/one-drive/token/refresh')
                if (!refreshResponse.ok) {
                    throw new Error('Please authenticate with OneDrive')
                }
                // Get new token after refresh
                const newTokenResponse = await fetch('/auth/one-drive/token')
                token = (await newTokenResponse.json()).token
            }

            await uploadToOneDrive(fileUrl, fileName, token)
            toast.dismiss(toastId)
            toast.success('File uploaded to OneDrive successfully')
        } catch (error) {
            toast.dismiss(toastId)
            if (error instanceof Error &&
                error.message === 'Please authenticate with OneDrive') {
                // Open auth popup
                const left = window.screenX + (window.outerWidth - 600) / 2
                const top = window.screenY + (window.outerHeight - 600) / 2

                const popup = window.open(
                    '/auth/one-drive',
                    'OneDriveAuth',
                    `width=600,height=600,left=${left},top=${top}`
                )

                if (!popup) {
                    throw new Error('Popup blocked. Please enable popups and try again.')
                }

                await new Promise<void>((resolve, reject) => {
                    const handleMessage = (event: MessageEvent) => {
                        if (event.data?.type === 'ONEDRIVE_AUTH_SUCCESS') {
                            window.removeEventListener('message', handleMessage)
                            resolve()
                        } else if (event.data?.type === 'ONEDRIVE_AUTH_ERROR') {
                            window.removeEventListener('message', handleMessage)
                            reject(new Error('Authentication failed'))
                        }
                    }
                    window.addEventListener('message', handleMessage)
                })

                // Retry upload after auth
                await handleUpload()
            } else {
                toast.error('Failed to upload file to OneDrive')
            }
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={handleUpload}
        >
            {isUploading ? (
                <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                </>
            ) : (
                'Save to OneDrive'
            )}
        </Button>
    )
}