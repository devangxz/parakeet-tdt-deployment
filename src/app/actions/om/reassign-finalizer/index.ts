'use server'

import { JobStatus, JobType, InputFileType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'
import assignFileToFinalizer from '@/services/transcribe-service/assign-file-to-finalizer'

export async function reassignFinalizer(formData: {
  orderId: number
  userEmail: string
  retainEarnings: boolean
  isCompleted: boolean
  comment: string
}) {
  try {
    const { orderId, userEmail, retainEarnings, isCompleted, comment } =
      formData

    if (!orderId) {
      return {
        success: false,
        message: 'Order Id parameter is required.',
      }
    }

    const orderInformation = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    })

    if (!orderInformation) {
      logger.error(`Order not found for ${orderId}`)
      return { success: false, message: 'Order not found' }
    }

    const currentJobAssignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: orderInformation.id,
        status: isCompleted ? JobStatus.COMPLETED : JobStatus.ACCEPTED,
        type: JobType.FINALIZE,
      },
    })

    if (!currentJobAssignment) {
      logger.error(`No job assignment found for ${orderId}`)
      return {
        success: false,
        message: 'No job assignment found',
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      logger.error(`User not found for ${userEmail}`)
      return { success: false, message: 'User not found' }
    }

    const isSameUser = currentJobAssignment.transcriberId === user.id

    if (isSameUser) {
      logger.error(
        `User is the same as the current finalizer for file ${orderId}`
      )
      await prisma.jobAssignment.update({
        where: { id: currentJobAssignment.id },
        data: {
          status: JobStatus.ACCEPTED,
          acceptedTs: new Date(),
        },
      })

      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'FINALIZER_ASSIGNED',
          updatedAt: new Date(),
        },
      })

      const templateData = {
        fileId: orderInformation.fileId,
        jobType: 'finalize',
        jobUrl: 'legal-cf-reviewer',
        comment: comment ?? '',
      }

      await sendTemplateMail(
        'REASSIGN_FILE',
        currentJobAssignment.transcriberId,
        templateData
      )

      return {
        success: true,
        message: 'Successfully re-assigned finalizer to the same user',
      }
    }

    await assignFileToFinalizer(
      Number(orderId),
      orderInformation.fileId,
      user.id,
      InputFileType.REVIEW_OUTPUT,
      'MANUAL',
      comment
    )

    await prisma.jobAssignment.update({
      where: { id: currentJobAssignment.id },
      data: {
        status: retainEarnings ? JobStatus.COMPLETED : JobStatus.REJECTED,
        ...(retainEarnings
          ? { completedTs: new Date() }
          : { cancelledTs: new Date() }),
      },
    })

    if (!retainEarnings) {
      const templateData = {
        fileId: orderInformation.fileId,
        type: 'Finalize',
        subject: 'Scribie Finalizer File Rejected',
        comment: comment ?? '',
      }
      await sendTemplateMail(
        'UNASSIGN_FILE',
        currentJobAssignment.transcriberId,
        templateData
      )
    }

    logger.info(`Successfully re-assigned finalizer for file ${orderId}`)
    return {
      success: true,
      message: 'Successfully re-assigned finalizer',
    }
  } catch (error) {
    logger.error(`Failed to re-assign finalizer`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
