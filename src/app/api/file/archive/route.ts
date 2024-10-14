import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user?.internalTeamUserId || user?.userId

  const { fileIds } = await req.json()
  const fileIdsArray = fileIds.split(',')

  try {
    const filesExist = await prisma.file.findMany({
      where: {
        fileId: { in: fileIdsArray },
        userId: userId,
      },
    })

    if (filesExist.length !== fileIdsArray.length) {
      logger.error(
        `Files with IDs ${fileIdsArray.join(', ')} not found for user ${userId}`
      )
      return NextResponse.json({
        success: false,
        message: 'Files not found for user',
      })
    }

    await prisma.file.updateMany({
      where: {
        fileId: { in: fileIdsArray },
        userId: userId,
      },
      data: { archived: true },
    })

    return NextResponse.json({
      success: true,
      message: 'File Archived Successfully',
    })
  } catch (err) {
    logger.error(
      `An error occurred while archiving the order for file ${fileIds}: ${err}`
    )
    return NextResponse.json({
      success: false,
      message: 'Failed to archive the order.',
    })
  }
}
