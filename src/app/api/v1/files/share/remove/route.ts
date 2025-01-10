import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { files } = await request.json()

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or empty files array',
        },
        { status: 400 }
      )
    }

    const deleteResults = await prisma.sharedFile.deleteMany({
      where: {
        fileId: { in: files },
        toUserId: user.userId,
      },
    })

    logger.info(
      `Successfully removed ${deleteResults.count} shared files for ${user.email}`
    )

    return NextResponse.json({
      success: true,
      message: 'Successfully removed the files',
      count: deleteResults.count,
    })
  } catch (error) {
    logger.error(`Error removing shared files: ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again later.',
      },
      { status: 500 }
    )
  }
}
