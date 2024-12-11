import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { toggleArchive } from '@/services/file-service'

export async function POST(req: Request) {
  try {
    const { fileId } = await req.json()
    const response = await toggleArchive({ fileId, archive: false })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while unarchiving file`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
