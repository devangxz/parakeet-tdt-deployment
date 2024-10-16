export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import { submitFile } from '@/services/editor-service/submit-file'

export async function POST(req: Request) {
    try {
        const { orderId, fileId, transcript } = await req.json()
        const userToken = req.headers.get('x-user-token')
        const user = JSON.parse(userToken ?? '{}')
        const transcriberId = user.userId

        if (!fileId) {
            return NextResponse.json(
                { error: 'File ID is required' },
                { status: 400 }
            )
        }

        await submitFile(orderId, transcriberId, transcript)

        return NextResponse.json({ message: 'QC submitted' })
    } catch (error) {
        console.error('Error fetching all files:', error)
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        )
    }
}
