'use server'

import { JobStatus, JobType, OrderStatus, InputFileType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToFinalizer from '@/services/transcribe-service/assign-file-to-finalizer'
import { checkExistingAssignment } from '@/utils/backend-helper'

export async function assignFileToReviewer(orderId: number) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId as number

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
      return { success: false, message: 'Order not found' }
    }

    if (order.status !== OrderStatus.REVIEW_COMPLETED) {
      logger.error(`Order is not reviewed for orderId ${orderId}`)
      return { success: false, message: 'Order is not reviewed' }
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
      return {
        success: false,
        message:
          'You have already reviewed the file so you cannot assign it to yourself.',
      }
    }

    const existingAssignment = await checkExistingAssignment(transcriberId)

    if (existingAssignment) {
      logger.error(`Assignment already exists for ${transcriberId}`)
      return {
        success: false,
        message: 'Please submit the current file before accepting other.',
      }
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
      return {
        success: false,
        message: "You can't assign a file if you've already rejected it.",
      }
    }

    await assignFileToFinalizer(
      orderId,
      order.fileId,
      transcriberId,
      InputFileType.REVIEW_OUTPUT,
      'AUTO'
    )

    logger.info(`Reviewer ${transcriberId} assigned for order ${orderId}`)
    return { success: true, message: 'Assigned file to Reviewer' }
  } catch (error) {
    logger.error(error)
    return { success: false, message: 'Failed to assign file to Reviewer' }
  }
}
