import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: { verifyToken: string } }
) {
  const verifyToken = params.verifyToken
  const { source } = await req.json()

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

    const user = await prisma.user.findUnique({
      where: {
        email: inviteExists.email,
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        source,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Update source successfully',
    })
  } catch (error) {
    logger.error('Error during source update', error)
    return NextResponse.json({
      success: false,
      message: 'Error during source update',
    })
  }
}
