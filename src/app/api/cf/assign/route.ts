import { JobStatus, JobType, OrderStatus, InputFileType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToFinalizer from '@/services/transcribe-service/assign-file-to-finalizer'
import { checkExistingAssignment } from '@/utils/backend-helper'

export async function POST(req: Request) {
  const { orderId } = await req.json()
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const transcriberId = user?.userId
  try {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        orderType: true,
        status: true,
        fileId: true,
      },
    })

    if (!order) {
      logger.error(`Order not found for orderId ${orderId}`)
      return NextResponse.json({ error: 'Order not found' }, { status: 400 })
    }

    if (order.status !== OrderStatus.REVIEW_COMPLETED) {
      logger.error(`Order is not reviewed for orderId ${orderId}`)
      return NextResponse.json(
        { error: 'Order is not reviewed' },
        { status: 400 }
      )
    }

    const checkReviewAssignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId,
        type: JobType.REVIEW,
        status: JobStatus.COMPLETED,
      },
    })

    if (checkReviewAssignment?.transcriberId === transcriberId) {
      logger.error(
        `Reviewer ${transcriberId} has already reviewed the order ${orderId}`
      )
      return NextResponse.json({
        error:
          'You have already reviewed the file so you cannot assign it to yourself.',
      })
    }
    const existingAssignment = await checkExistingAssignment(transcriberId)

    if (existingAssignment) {
      logger.error(`Assignment already exists for ${transcriberId}`)
      return NextResponse.json({
        error: 'Please submit the current file before accepting other.',
      })
    }

    const rejectedAssignment = await prisma.jobAssignment.findFirst({
      where: {
        transcriberId,
        status: JobStatus.REJECTED,
        type: JobType.FINALIZE,
        orderId,
      },
    })

    if (rejectedAssignment) {
      logger.error(
        `${transcriberId} has already rejected the order ${orderId} and tried to assign it.`
      )
      return NextResponse.json({
        error: "You can't assign a file if you've already rejected it.",
      })
    }

    await assignFileToFinalizer(
      orderId,
      order.fileId,
      transcriberId,
      InputFileType.REVIEW_OUTPUT
    )

    logger.info(`Reviewer ${transcriberId} assigned for order ${orderId}`)
    return NextResponse.json({ message: 'Assigned file to Reviewer' })
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: `Failed to assign file to Reviewer` },
      { status: 500 }
    )
  }
}
