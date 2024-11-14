import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  try {
    const searchParams = request.nextUrl.searchParams
    const fileIdsParam = searchParams.get('file_ids')
    if (!fileIdsParam) {
      return NextResponse.json({
        success: false,
        message: 'Missing file_ids parameter',
      })
    }
    const fileIds = fileIdsParam.split(',')

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

    logger.info(`Sent shared files users for ${user.email}`)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    logger.error(`Error sending shared files users for ${user.email}: ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again later.',
    })
  }
}
