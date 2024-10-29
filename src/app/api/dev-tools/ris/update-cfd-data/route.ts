import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { fileId, cfd } = await request.json()

    if (!fileId || !cfd) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    logger.info(`Updating CFD data for fileId: ${fileId}`)

    const updatedFile = await prisma.file.update({
      where: { fileId },
      data: { customFormattingDetails: cfd },
      select: { customFormattingDetails: true },
    })

    if (!updatedFile) {
      logger.warn(`File not found for fileId: ${fileId}`)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    logger.info(`Successfully updated CFD data for fileId: ${fileId}`)
    return NextResponse.json({
      success: true,
      updatedCfdData: updatedFile.customFormattingDetails,
    })
  } catch (error) {
    logger.error('Error updating CFD data:', error)
    return NextResponse.json(
      { error: 'Failed to update CFD data' },
      { status: 500 }
    )
  }
}
