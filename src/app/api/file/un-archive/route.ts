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
      logger.error(`File with ID ${fileIds} not found for user ${userId}`)
      return NextResponse.json(
        { code: -1, message: 'File not found for user' },
        { status: 404 }
      )
    }
    await prisma.file.updateMany({
      where: {
        fileId: { in: fileIdsArray },
        userId: userId,
      },
      data: { archived: false },
    })
    return NextResponse.json({ message: 'Order Unarchived Successfully' })
  } catch (err) {
    logger.error(
      `An error occurred while unarchiving the order for file ${fileIds}: ${err}`
    )
    return NextResponse.json(
      { message: 'Failed to unarchive the file.' },
      { status: 500 }
    )
  }
}
