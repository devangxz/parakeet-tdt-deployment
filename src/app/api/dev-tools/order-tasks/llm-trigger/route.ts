import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  WORKER_QUEUE_NAMES,
  workerQueueService,
} from '@/services/worker-service'

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json()

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { fileId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await workerQueueService.createJob(WORKER_QUEUE_NAMES.LLM_MARKING, {
      orderId: order.id,
      fileId: order.fileId,
    })

    logger.info(`LLM marking job created for file ${fileId}`)

    return NextResponse.json({
      success: true,
      message: 'LLM marking triggered successfully',
    })
  } catch (error) {
    logger.error('Error triggering LLM marking:', error)
    return NextResponse.json(
      { error: 'Failed to trigger LLM marking' },
      { status: 500 }
    )
  }
}
