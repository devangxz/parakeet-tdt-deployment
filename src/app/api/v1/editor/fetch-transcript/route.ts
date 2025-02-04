export const dynamic = 'force-dynamic'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.internalTeamUserId || user.userId

    const searchParams = req.nextUrl.searchParams
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const transcriptRes = await axios.get(
      `${FILE_CACHE_URL}/fetch-transcript?fileId=${fileId}&userId=${userId}`,
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )

    logger.info(`Fetched transcript of ${fileId}`)

    return NextResponse.json({
      success: true,
      result: {
        transcript: transcriptRes.data.result.transcript,
      },
    })
  } catch (error) {
    logger.error(`Failed to get file transcript for editor, ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
