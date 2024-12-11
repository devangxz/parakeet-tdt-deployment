'use server'

import { OrderStatus, JobStatus, JobType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import unAssignFileFromTranscriber from '@/services/transcribe-service/unassign-file-from-transcriber'

export async function unassignFile(orderId: number) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId as number

  try {
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
      return { success: false, message: 'No file assigned to you' }
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
    return { success: true, message: 'Order has been unassigned' }
  } catch (error) {
    logger.error(error)
    return { success: false, message: "Couldn't unassign file" }
  }
}
