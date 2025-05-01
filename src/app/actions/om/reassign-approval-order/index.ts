'use server'

import { OrderStatus, JobStatus, JobType, InputFileType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import assignFileToQC from '@/services/transcribe-service/assign-file-to-qc'

export async function reassignApprovalOrder(formData: {
  orderId: number
  userEmail: string
  retainEarnings: boolean
  retainTranscript: boolean
  comment: string
}) {
  try {
    const { orderId, userEmail, retainEarnings, retainTranscript, comment } =
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
        status: JobStatus.SUBMITTED_FOR_APPROVAL,
      },
    })

    if (!currentJobAssignment) {
      logger.error(`No completed job assignment found for ${orderId}`)
      return {
        success: false,
        message: 'No completed job assignment found',
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      logger.error(`User not found for ${userEmail}`)
      return { success: false, message: 'User not found' }
    }

    await assignFileToQC(
      Number(orderId),
      OrderStatus.QC_ASSIGNED,
      user.id,
      JobType.QC,
      retainTranscript ? InputFileType.QC_OUTPUT : InputFileType.ASR_OUTPUT,
      orderInformation.fileId,
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

    const qcValidationStats = await prisma.qCValidationStats.findFirst({
      where: {
        orderId: orderInformation.id,
        fileId: orderInformation.fileId,
        transcriberId: currentJobAssignment.transcriberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (qcValidationStats) {
      await prisma.qCValidationStats.update({
        where: {
          id: qcValidationStats.id,
        },
        data: {
          isAcceptedByOM: retainEarnings ? true : false,
        },
      })
    }

    logger.info(`Successfully re-assigned qc for file ${orderId}`)
    return {
      success: true,
      message: 'Successfully re-assigned qc file',
    }
  } catch (error) {
    logger.error(`Failed to re-assign qc`, error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
