import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { renameFile } from '@/services/file-service'

export async function POST(req: Request) {
  try {
    const { fileId, newName } = await req.json()
    const response = await renameFile({ fileId, newName })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while renaming file`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
