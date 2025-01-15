import { NextResponse, NextRequest } from 'next/server'

import logger from '@/lib/logger'
import transferFiles from '@/services/file-service/transfer'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const fromUserId = user.userId

    const { fileIds, toUserId } = await request.json()

    if (!fileIds) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const response = await transferFiles(fileIds, fromUserId, toUserId)

    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while transferring files`, error)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
