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

    const jobAssignment = await prisma.jobAssignment.findFirst({
      where: {
        transcriberId,
        orderId: orderId,
        type: JobType.FINALIZE,
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
      OrderStatus.REVIEW_COMPLETED,
      JobStatus.CANCELLED,
      jobAssignment.transcriberId,
      order?.fileId ?? '',
      'Finalize'
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
