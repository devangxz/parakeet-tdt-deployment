import { OrderStatus, JobStatus, JobType } from '@prisma/client'
import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import unAssignFileFromTranscriber from '@/services/transcribe-service/unassign-file-from-transcriber'

export async function POST(request: Request) {
  const userToken = request.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const { orderId, type } = await request.json()
  const transcriberId = user?.userId
  try {
    if (!orderId || !type) {
      return NextResponse.json(
        { error: 'orderId and type are required' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 400 })
    }

    const jobAssignment = await prisma.jobAssignment.findFirst({
      where: {
        transcriberId,
        orderId: orderId,
        type:
          order.status === OrderStatus.QC_ASSIGNED
            ? JobType.QC
            : JobType.REVIEW,
        status: JobStatus.ACCEPTED,
      },
    })

    if (!jobAssignment) {
      return NextResponse.json(
        { error: 'No file assigned  to you' },
        { status: 400 }
      )
    }

    await unAssignFileFromTranscriber(
      Number(orderId),
      jobAssignment.id,
      order.status === OrderStatus.QC_ASSIGNED
        ? OrderStatus.TRANSCRIBED
        : OrderStatus.FORMATTED,
      JobStatus.CANCELLED,
      jobAssignment.transcriberId,
      order.fileId,
      order.status === OrderStatus.QC_ASSIGNED ? 'QC' : 'REVIEW'
    )

    logger.info(`Order ${orderId} has been unassigned from ${transcriberId}`)
    return NextResponse.json(
      { message: 'Order has been unassigned' },
      { status: 200 }
    )
  } catch (error) {
    logger.error(error)
    return NextResponse.json(
      { error: "Couldn't unassign file" },
      { status: 400 }
    )
  }
}
