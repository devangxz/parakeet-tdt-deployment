export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { getDownloadUrl } from '@/services/file-service/download-service'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('parentId')
    const response = await getDownloadUrl({ fileId: fileId ?? '' })
    return NextResponse.json(response)
  } catch (error) {
    logger.error(`Error while generating download URL`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
