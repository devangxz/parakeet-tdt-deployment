'use server'

import {
  JobStatus,
  JobType,
  OrderStatus,
  InputFileType,
  AssignMode,
} from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToQC from '@/services/transcribe-service/assign-file-to-qc'
import {
  checkExistingAssignment,
  isTranscriberICQC,
} from '@/utils/backend-helper'

export async function assignQC(orderId: number, isICQC: boolean = false) {
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

    // If user is assigning as ICQC, verify they have ICQC status
    if (isICQC) {
      const isICQCResult = await isTranscriberICQC(transcriberId)
      if (!isICQCResult.isICQC) {
        logger.error(`User ${transcriberId} is not authorized as IC QC`)
        return {
          success: false,
          error: 'You are not authorized to take IC QC files',
        }
      }
    }

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
      return {
        success: false,
        error: 'Order not found',
      }
    }

    if (
      order.status !== OrderStatus.TRANSCRIBED &&
      order.status !== OrderStatus.FORMATTED
    ) {
      logger.error(
        `Order status ${order.status} is not valid for QC assignment for orderId ${orderId}`
      )
      return {
        success: false,
        error: 'Order is not in a valid state for QC assignment',
      }
    }

    const checkExistingAssignmentResult = await checkExistingAssignment(
      transcriberId
    )

    if (checkExistingAssignmentResult) {
      logger.error(`Found existing assignment for ${transcriberId}`)
      return {
        success: false,
        error: 'Please submit the current file before accepting other.',
      }
    }

    if (!isICQC) {
      const rejectedAssignment = await prisma.jobAssignment.findFirst({
        where: {
          transcriberId,
          status: {
            in: [JobStatus.REJECTED, JobStatus.CANCELLED],
          },
          type: JobType.QC,
          orderId,
        },
      })

      if (rejectedAssignment) {
        logger.error(
          `${transcriberId} has already rejected the order ${orderId} and tried to assign it.`
        )
        return {
          success: false,
          error: "You can't assign a file if you've already rejected it.",
        }
      }
    }

    const result = await assignFileToQC(
      orderId,
      order.status === 'TRANSCRIBED'
        ? OrderStatus.QC_ASSIGNED
        : OrderStatus.REVIEWER_ASSIGNED,
      transcriberId,
      order.status === 'TRANSCRIBED' ? JobType.QC : JobType.REVIEW,
      order.status === 'TRANSCRIBED'
        ? InputFileType.ASR_OUTPUT
        : InputFileType.LLM_OUTPUT,
      order.fileId,
      AssignMode.AUTO,
      '',
      isICQC
    )

    if (!result) {
      return {
        success: false,
        error:
          'This file is already assigned to another QC. Please try another file.',
      }
    }

    logger.info(
      `QC ${user.email} assigned for order ${order.fileId}${
        isICQC ? ' as IC QC' : ''
      }`
    )
    return {
      success: true,
      message: 'Assigned file to QC',
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false,
      error: 'Failed to assign file to QC',
    }
  }
}
