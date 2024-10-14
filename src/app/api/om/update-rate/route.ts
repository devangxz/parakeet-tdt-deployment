import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { fileId, rate } = await req.json()

    if (!fileId) {
      return NextResponse.json({
        success: false,
        message: 'File Id parameter is required.',
      })
    }

    const fileInformation = await prisma.file.findUnique({
      where: { fileId: fileId },
    })

    if (!fileInformation) {
      logger.error(`File not found for ${fileId}`)
      return NextResponse.json({
        success: false,
        message: 'File not found',
      })
    }

    const cost = ((rate * fileInformation.duration) / 3600).toFixed(2)

    await prisma.order.update({
      where: { fileId: fileId },
      data: { qcCost: Number(cost), updatedAt: new Date() },
    })

    logger.info(`finalizer rate updated to $${rate}/ah, $${cost}`)
    return NextResponse.json({
      success: true,
      message: 'Rate updated successfully',
    })
  } catch (error) {
    logger.error(`Failed to update rate`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
