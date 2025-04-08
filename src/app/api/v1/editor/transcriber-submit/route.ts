import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { submitQCFile } from '@/services/editor-service/submit-qc-file'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const auth = authHeader?.split(' ')
    const auth_key = auth && auth[0] === 'Basic' && auth[1] ? auth[1] : null

    if (!auth_key || auth_key !== process.env.SCRIBIE_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      })
    }

    const { fileId, transcriberId, transcript, listenCount, editedSegments } =
      await req.json()

    if (!fileId || !transcriberId || !transcript) {
      return NextResponse.json({
        success: false,
        message:
          'Missing required fields: fileId, transcriberId, and transcript are all required.',
      })
    }

    const order = await prisma.order.findUnique({
      where: {
        fileId,
      },
    })

    if (!order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found.',
      })
    }

    await prisma.playStats.upsert({
      where: {
        userId_fileId: {
          userId: Number(transcriberId),
          fileId,
        },
      },
      create: {
        userId: Number(transcriberId),
        fileId,
        listenCount,
        editedSegments,
      },
      update: {
        listenCount,
        editedSegments,
        updatedAt: new Date(),
      },
    })

    logger.info(`--> submitQCFile ${order.fileId} ${transcriberId}`)

    await submitQCFile(order.id, transcriberId, transcript)

    return NextResponse.json({
      success: true,
      message: 'QC file submitted successfully.',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'An internal server error occurred.',
    })
  }
}
