import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { getSharedFiles } from '@/services/file-service/get-files'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const response = await getSharedFiles(
      user.internalTeamUserId || user.userId
    )

    logger.info(`Shared files fetched successfully for ${user.email}`)
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching shared files', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch shared files',
      },
      { status: 500 }
    )
  }
}
