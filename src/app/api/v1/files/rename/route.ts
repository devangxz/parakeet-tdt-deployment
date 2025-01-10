import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { renameFile } from '@/services/file-service'

export async function POST(req: NextRequest) {
  const user = await authenticateRequest(req)

  try {
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, newName } = await req.json()

    if (!fileId) {
      return NextResponse.json(
        { message: 'File IDs is required' },
        { status: 400 }
      )
    }

    const response = await renameFile({ fileId, newName })
    logger.info(`Successfully renamed: ${fileId} to ${newName}`)

    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Failed to rename file: ${error}`)
    return NextResponse.json(
      { message: 'Error renaming file' },
      { status: 500 }
    )
  }
}
