import { JobStatus, JobType, OrderStatus } from '@prisma/client'
import axios from 'axios'
import { NextRequest, NextResponse } from 'next/server'

import { FILE_CACHE_URL } from '@/constants'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import authenticateWebhook from '@/utils/authenticateWebhook'

export async function POST(req: NextRequest) {
  // Authenticate webhook and check rate limit
  const authResult = await authenticateWebhook(req, 'LLM-WORKER')
  if (authResult.error) return authResult.error

  const llmResult = await req.json()
  const { fileId, transcript, LLMTimeTaken } = llmResult

  try {
    const order = await prisma.order.findUnique({
      where: {
        fileId,
      },
      include: {
        user: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const assignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: order.id,
        type: JobType.REVIEW,
        status: JobStatus.ACCEPTED,
      },
    })

    if (!assignment) {
      logger.error(
        `Assignment not found for file ${order.fileId} type REVIEW status ACCEPTED`
      )
    }

    const reviewerId = assignment?.transcriberId || order.userId

    // Save transcript to file cache
    await axios.post(
      `${FILE_CACHE_URL}/save-transcript`,
      {
        fileId: fileId,
        transcript: transcript,
        isCF: true,
        userId: reviewerId,
      },
      {
        headers: {
          'x-api-key': process.env.SCRIBIE_API_KEY,
        },
      }
    )

    // Update order status based on review assignment
    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        LLMTimeTaken,
        status: assignment
          ? OrderStatus.REVIEWER_ASSIGNED
          : OrderStatus.FORMATTED,
        updatedAt: new Date(),
      },
    })

    logger.info(`LLM webhook processed successfully for file ID ${fileId}`)
    return NextResponse.json(null, { status: 200 })
  } catch (error) {
    logger.error(`Error processing LLM webhook for file ID ${fileId}:`, error)
    return NextResponse.json(
      { error: `Error processing LLM webhook for file ID ${fileId}` },
      { status: 500 }
    )
  }
}
