import { OrderStatus, ReportMode } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { fileId, comments, reportOption } = await req.json()

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

    await prisma.order.update({
      where: { fileId: fileId },
      data: {
        status: OrderStatus.SUBMITTED_FOR_SCREENING,
        updatedAt: new Date(),
        reportComment: comments,
        reportMode: ReportMode.OM,
        reportOption,
      },
    })

    logger.info(`reported bad audio, for ${fileId}`)
    return NextResponse.json({
      success: true,
      message: 'Successfully reported',
    })
  } catch (error) {
    logger.error(`Failed to report bad audio`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
