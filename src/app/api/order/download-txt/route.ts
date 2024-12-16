export const dynamic = 'force-dynamic'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url)
        const fileId = url.searchParams.get('fileId') as string
        const userToken = req.headers.get('x-user-token')
        const user = JSON.parse(userToken ?? '{}')
        const userId = user?.userId

        const response = await axios.get(`${FILE_CACHE_URL}/fetch-transcript?fileId=${fileId}&userId=${userId}`, {
            headers: {
                'x-api-key': process.env.SCRIBIE_API_KEY
            }
        })

        const transcript = response.data.result.transcript;

        return NextResponse.json({
            content: transcript,
            filename: fileId,
            type: 'text/plain'
        });

    } catch (error) {
        logger.error(`Failed to send docx file ${error}`)
        return NextResponse.json({
            success: false,
            message: 'An error occurred. Please try again after some time.',
        }, { status: 500 })
    }
}
