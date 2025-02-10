'use server'

import { OrderStatus, JobStatus, JobType, CancellationStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import unAssignFileFromTranscriber from '@/services/transcribe-service/unassign-file-from-transcriber'

export async function unassignQCFile(orderId: number, reason: string, comment: string) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const transcriberId = user?.userId

    if (!transcriberId) {
      logger.error('User not authenticated')
      return {
        success: false,
        error: 'User not authenticated',
      }
    }

    const order = await prisma.order.findUnique({
      where: {
        id: Number(orderId),
      },
    })

    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      }
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
      return {
        success: false,
        error: 'No file assigned to you',
      }
    }

    await prisma.cancellations.create({
      data: {
        userId: transcriberId,
        fileId: order.fileId,
        reason,
        comment,
        status: order.status === OrderStatus.QC_ASSIGNED ? CancellationStatus.QC : CancellationStatus.REVIEW,
      },
    })

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
    return {
      success: true,
      message: 'Order has been unassigned',
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      error: "Couldn't unassign file",
    }
  }
}
