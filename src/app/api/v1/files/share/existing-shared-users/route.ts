import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileIds = searchParams.get('fileIds')?.split(',')

    if (!fileIds || fileIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing file IDs',
        },
        { status: 400 }
      )
    }

    const sharedFiles = await prisma.sharedFile.findMany({
      where: {
        fileId: {
          in: Array.from(new Set(fileIds)),
        },
      },
      select: {
        fileId: true,
        permission: true,
        toUser: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    })

    const result = sharedFiles.map((sf) => ({
      email: sf.toUser.email,
      fullname: `${sf.toUser.firstname || ''} ${
        sf.toUser.lastname || ''
      }`.trim(),
      file_id: sf.fileId,
      to_user_id: sf.toUser.id,
      permission: sf.permission,
    }))

    logger.info(`Sent shared files users for ${user?.email}`)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    logger.error(`Error sending shared files users: ${error}`)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred. Please try again later.',
      },
      { status: 500 }
    )
  }
}
