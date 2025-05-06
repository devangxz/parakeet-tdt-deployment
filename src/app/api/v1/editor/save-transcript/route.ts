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
    const userId = user.internalTeamUserId || user.userId

    const { transcript, fileId } = await req.json()

    await axios.post(
      `${FILE_CACHE_URL}/save-transcript`,
      {
        fileId: fileId,
        transcript: transcript,
        userId: userId,
        isSaveFromAPI: true,
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
