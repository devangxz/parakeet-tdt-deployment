export const dynamic = 'force-dynamic'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url)
        const fileId = url.searchParams.get('fileId') as string
        const docType = url.searchParams.get('docType')
        const userToken = req.headers.get('x-user-token')
        const user = JSON.parse(userToken ?? '{}')
        const userId = user.internalTeamUserId ?? user?.userId

        if (docType === "CUSTOM_FORMATTING_DOC") {
            const response = await axios.get(`${FILE_CACHE_URL}/get-cf-pdf/${fileId}?type=${docType}&userId=${userId}`, {
                headers: {
                    'x-api-key': process.env.SCRIBIE_API_KEY
                },
                responseType: 'arraybuffer'
            })
            const pdfBuffer = Buffer.from(response.data, 'binary')

            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${fileId}.pdf"`
                }
            })
        } else if (docType === 'TRANSCRIPTION_DOC') {
            const response = await axios.get(`${FILE_CACHE_URL}/get-tr-pdf/${fileId}?type=${docType}&userId=${userId}`, {
                headers: {
                    'x-api-key': process.env.SCRIBIE_API_KEY
                },
                responseType: 'arraybuffer'
            })
            const pdfBuffer = Buffer.from(response.data, 'binary')

            return new NextResponse(pdfBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${fileId}.pdf"`
                }
            })
        }
    } catch (error) {
        logger.error(`Failed to send docx file ${error}`)
        return NextResponse.json({
            success: false,
            message: 'An error occurred. Please try again after some time.',
        })
    }
}
