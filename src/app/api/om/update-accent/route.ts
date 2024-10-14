import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const userToken = req.headers.get('x-user-token')
    const user = JSON.parse(userToken ?? '{}')
    const { fileId, accentCode } = await req.json()

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

    await prisma.fileAccent.create({
      data: {
        userId: user?.userId,
        fileId: fileId,
        accentCode: accentCode,
      },
    })

    logger.info(
      `Accent set to ${accentCode} for file ${fileId} by user ${user?.user}`
    )
    return NextResponse.json({
      success: true,
      message: 'Accent updated successfully',
    })
  } catch (error) {
    logger.error(`Failed to update accent`, error)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again after some time.',
    })
  }
}
