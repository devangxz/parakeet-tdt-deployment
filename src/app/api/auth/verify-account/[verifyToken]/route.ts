import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: { verifyToken: string } }
) {
  const verifyToken = params.verifyToken

  try {
    const inviteExists = await prisma.invite.findUnique({
      where: {
        inviteKey: verifyToken,
      },
    })

    if (!inviteExists) {
      return NextResponse.json({
        success: false,
        message: 'Invalid invite key',
      })
    }

    if (inviteExists.accepted) {
      return NextResponse.json({
        success: true,
        message: 'Account verified successfully',
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        email: inviteExists.email,
      },
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'VERIFIED',
      },
    })

    await prisma.invite.update({
      where: { inviteKey: verifyToken },
      data: {
        accepted: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Account verified successfully',
    })
  } catch (error) {
    logger.error('Error during account verification', error)
    return NextResponse.json({
      success: false,
      message: 'Error during account verification',
    })
  }
}
