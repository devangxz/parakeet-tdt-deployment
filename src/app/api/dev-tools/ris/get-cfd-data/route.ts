export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const fileId = searchParams.get('fileId')

  if (!fileId) {
    return NextResponse.json(
      { error: 'Missing required fileId parameter' },
      { status: 400 }
    )
  }

  try {
    logger.info(`Fetching CFD data for fileId: ${fileId}`)

    const file = await prisma.file.findUnique({
      where: { fileId },
      select: { customFormattingDetails: true },
    })

    if (!file) {
      logger.warn(`File not found for fileId: ${fileId}`)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    logger.info(`Successfully retrieved CFD data for fileId: ${fileId}`)
    return NextResponse.json({
      success: true,
      cfdData: file.customFormattingDetails,
    })
  } catch (error) {
    logger.error(`Error fetching CFD data for fileId ${fileId}:`, error)
    return NextResponse.json(
      { error: 'Failed to retrieve CFD data' },
      { status: 500 }
    )
  }
}
