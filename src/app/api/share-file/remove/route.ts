import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')

  try {
    const { files } = await request.json()

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid or empty files array',
      })
    }

    console.log(files, user)

    const deleteResults = await prisma.sharedFile.deleteMany({
      where: {
        fileId: { in: files },
        toUserId: user.userId,
      },
    })

    console.log(deleteResults)

    logger.info(
      `Successfully removed ${deleteResults.count} shared files for ${user.email}`
    )

    return NextResponse.json({
      success: true,
      message: 'Successfully removed the files',
      count: deleteResults.count,
    })
  } catch (error) {
    logger.error(`Error removing shared files for ${user.email}: ${error}`)
    return NextResponse.json({
      success: false,
      message: 'An error occurred. Please try again later.',
    })
  }
}
