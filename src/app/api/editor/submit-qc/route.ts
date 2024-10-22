export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { submitQCFile } from '@/services/editor-service/submit-qc-file'

export async function POST(req: Request) {
    let fileId = ''
    let transcriberId = 0;
    try {
        const { orderId, fileId: fid, transcript } = await req.json()
        fileId = fid
        const userToken = req.headers.get('x-user-token')
        const user = JSON.parse(userToken ?? '{}')
        transcriberId = user.userId

        if (!fileId) {
            return NextResponse.json(
                { error: 'File ID is required' },
                { status: 400 }
            )
        }

        await submitQCFile(orderId, transcriberId, transcript)
        logger.info(`QC submitted for file ${fileId} by ${transcriberId}`)
        return NextResponse.json({ message: 'QC submitted' })
    } catch (error) {
        logger.error(`Error error submitting file ${fileId} by ${transcriberId}: ${error}`)
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        )
    }
}
