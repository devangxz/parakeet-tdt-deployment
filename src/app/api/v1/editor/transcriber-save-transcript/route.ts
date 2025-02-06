export const dynamic = 'force-dynamic'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const auth = authHeader?.split(' ')
    const auth_key = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

    if (!auth_key || auth_key !== process.env.SCRIBIE_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { transcript, fileId, userId } = await req.json()

    await axios.post(
      `${FILE_CACHE_URL}/save-transcript`,
      {
        fileId: fileId,
        transcript: transcript,
        userId: parseInt(userId),
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )

    logger.info(`Successfully saved transcript of ${fileId}`)

    return NextResponse.json({
      success: true,
      message: 'Transcript saved successfully',
    })
  } catch (error) {
    logger.error(`Failed to save transcript of file, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
