import { JobStatus, JobType, OrderStatus, InputFileType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToQC from '@/services/transcribe-service/assign-file-to-qc'
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

    if (
      order.status !== OrderStatus.TRANSCRIBED &&
      order.status !== OrderStatus.FORMATTED
    ) {
      logger.error(`Order is not transcribed for orderId ${orderId}`)
      return NextResponse.json(
        { error: 'Order is not transcribed' },
        { status: 400 }
      )
    }

    const checkExistingAssignmentResult = await checkExistingAssignment(
      transcriberId
    )

    if (checkExistingAssignmentResult) {
      logger.error(`Found existing assignment for ${transcriberId}`)
      return NextResponse.json(
        {
          error: 'Please submit the current file before accepting other.',
        },
        { status: 400 }
      )
    }

    const rejectedAssignment = await prisma.jobAssignment.findFirst({
      where: {
        transcriberId,
        status: JobStatus.REJECTED,
        type: JobType.QC,
        orderId,
      },
    })

    if (rejectedAssignment) {
      logger.error(
        `${transcriberId} has already rejected the order ${orderId} and tried to assign it.`
      )
      return NextResponse.json(
        {
          error: "You can't assign a file if you've already rejected it.",
        },
        { status: 400 }
      )
    }

    await assignFileToQC(
      Number(orderId),
      order.status === 'TRANSCRIBED'
        ? OrderStatus.QC_ASSIGNED
        : OrderStatus.REVIEWER_ASSIGNED,
      transcriberId,
      order.status === 'TRANSCRIBED' ? JobType.QC : JobType.REVIEW,
      order.status === 'TRANSCRIBED'
        ? InputFileType.ASR_OUTPUT
        : InputFileType.LLM_OUTPUT,
      order.fileId
    )

    logger.info(`QC ${transcriberId} assigned for order ${orderId}`)
    return NextResponse.json(
      { message: 'Assigned file to QC' },
      { status: 200 }
    )
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: `Failed to assign file to QC` },
      { status: 500 }
    )
  }
}
