import { ReloadIcon } from '@radix-ui/react-icons'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadToBox } from '@/utils/box'

interface BoxUploadButtonProps {
    fileUrl: string
    fileName: string
}

export function BoxUploadButton({ fileUrl, fileName }: BoxUploadButtonProps) {
    const [isUploading, setIsUploading] = useState(false)

    const handleUpload = async () => {
        setIsUploading(true)
        const toastId = toast.loading('Uploading to Box...')

        try {
            const tokenResponse = await fetch('/box/token')
            let token = tokenResponse.ok ? (await tokenResponse.json()).token : null

            if (!token) {
                // Initiate Box OAuth flow
                const left = window.screenX + (window.outerWidth - 600) / 2
                const top = window.screenY + (window.outerHeight - 600) / 2

                const popup = window.open(
                    '/auth/box',
                    'BoxAuth',
                    `width=600,height=600,left=${left},top=${top}`
                )

                if (!popup) {
                    throw new Error('Popup blocked. Please enable popups and try again.')
                }

                await new Promise<void>((resolve, reject) => {
                    const handleMessage = (event: MessageEvent) => {
                        if (event.data?.type === 'BOX_AUTH_SUCCESS') {
                            window.removeEventListener('message', handleMessage)
                            resolve()
                        } else if (event.data?.type === 'BOX_AUTH_ERROR') {
                            window.removeEventListener('message', handleMessage)
                            reject(new Error('Authentication failed'))
                        }
                    }
                    window.addEventListener('message', handleMessage)
                })

                // Get token after auth
                const newTokenResponse = await fetch('/box/token')
                token = (await newTokenResponse.json()).token
            }

            await uploadToBox(fileUrl, fileName, token)
            toast.dismiss(toastId)
            toast.success('File uploaded to Box successfully')
        } catch (error) {
            toast.dismiss(toastId)
            toast.error('Failed to upload file to Box')
            console.error('Box upload error:', error)
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
                'Save to Box'
            )}
        </Button>
    )
}