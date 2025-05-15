import {
  JobStatus,
  OrderStatus,
  JobType,
  InputFileType,
  AssignMode,
} from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export const updateOrderAndJobAssignment = async (
  orderId: number,
  jobAssignmentId: number,
  currentOrderStatus: OrderStatus,
  currentJobStatus: JobStatus
) => {
  logger.info(`--> updateOrderAndJobAssignment ${orderId}`)
  try {
    await prisma.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: currentOrderStatus,
          updatedAt: new Date(),
        },
      })

      const updateData = {
        status: currentJobStatus,
        ...(currentJobStatus === JobStatus.COMPLETED
          ? { completedTs: new Date() }
          : { cancelledTs: new Date() }),
      }

      await prisma.jobAssignment.update({
        where: {
          id: jobAssignmentId,
        },
        data: updateData,
      })
    })
  } catch (error) {
    logger.error(`failed to update job assignment ${orderId}: ${error}`)
    throw new Error()
  }
}

export const updateOrderAndCreateJobAssignment = async (
  orderId: number,
  currentOrderStatus: OrderStatus,
  transcriberId: number,
  jobType: JobType,
  inputFile: InputFileType,
  assignMode: AssignMode,
  comment?: string,
  isICQC: boolean = false
) => {
  logger.info(`--> updateOrderAndCreateJobAssignment ${orderId}`)
  try {
    return await prisma.$transaction(
      async (prisma) => {
        // First fetch the order to check if it exists
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true },
        })

        if (!order) {
          throw new Error(`Order ${orderId} not found`)
        }

        // Check if there's already an active assignment for this order
        const existingAssignment = await prisma.jobAssignment.findFirst({
          where: {
            orderId,
            type: jobType,
            status: JobStatus.ACCEPTED,
          },
        })

        if (existingAssignment) {
          logger.info(
            `Order ${orderId} is already assigned to transcriber ${existingAssignment.transcriberId}`
          )
          return false
        }

        // Update order status
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: currentOrderStatus,
            updatedAt: new Date(),
          },
        })

        // Create new job assignment
        await prisma.jobAssignment.create({
          data: {
            orderId,
            type: jobType,
            transcriberId: transcriberId,
            inputFile: inputFile,
            assignMode,
            ...(comment && { comment }),
            isICQC,
          },
        })

        logger.info(
          `File assigned to ${transcriberId}${isICQC ? ' as IC QC' : ''}`
        )
        return true
      },
      {
        // Set a reasonable timeout for the transaction
        timeout: 10000,
        // Enable serializable isolation level for pessimistic locking
        isolationLevel: 'Serializable',
      }
    )
  } catch (error) {
    logger.error(`Failed to create job assignment ${orderId}: ${error}`)
    return false
  }
}
