import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { toggleArchive } from '@/services/file-service'

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const response = await toggleArchive({
      fileId: fileId.join(','),
      archive: true,
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while archiving file`, error)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again after some time.',
      },
      { status: 500 }
    )
  }
}
