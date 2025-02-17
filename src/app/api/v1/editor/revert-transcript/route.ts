export const dynamic = 'force-dynamic'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, type } = await req.json()

    const response = await axios.post(
      `${FILE_CACHE_URL}/revert-transcript`,
      {
        fileId: fileId,
        type: type,
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )

    logger.info(`Successfully reverted transcript of ${fileId}`)

    return NextResponse.json({
      success: true,
      message: 'Transcript reverted successfully',
      transcript: response.data.result.transcript,
    })
  } catch (error) {
    logger.error(`Failed to revert transcript of file, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
