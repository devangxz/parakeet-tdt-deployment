import { Role } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import isValidEmail from '@/utils/isValidEmail'

export async function POST(req: Request) {
  const { userEmail, fileIds: fileIdsString } = await req.json()
  const fileIds = fileIdsString.split(',')
  try {
    if (!isValidEmail(userEmail)) {
      logger.error(`Invalid email: ${userEmail}`)
      return NextResponse.json({ success: false, s: 'Invalid email' })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail,
      },
    })

    if (!user) {
      logger.error(`User not found with email ${userEmail}`)
      return NextResponse.json({ success: false, s: 'User not found' })
    }

    const files = await prisma.file.findMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
      select: {
        user: true,
      },
    })

    if (files.length === 0) {
      logger.error(`Files not found with ids ${fileIds}`)
      return NextResponse.json({ success: false, s: 'Files not found' })
    }

    const UserRole = files[0].user.role
    if (UserRole !== Role.ADMIN) {
      logger.error(`File transfer is only allowed from admin account`)
      return NextResponse.json({
        success: false,
        s: 'File transfer only allowed from admin account to user',
      })
    }

    await prisma.file.updateMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
      data: {
        userId: user.id,
      },
    })

    logger.info(`files transferred successfully for user ${user.email}`)

    return NextResponse.json({
      success: true,
      message: `Files transferred successfully`,
    })
  } catch (error) {
    logger.error(`Error transferring files`, error)
    return NextResponse.json({
      success: false,
      s: 'An error occurred. Please try again after some time.',
    })
  }
}
