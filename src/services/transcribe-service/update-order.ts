import { JobStatus, OrderStatus, JobType, InputFileType } from '@prisma/client'

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
  inputFile: InputFileType
) => {
  logger.info(`--> updateOrderAndCreateJobAssignment ${orderId}`)
  try {
    await prisma.$transaction(async (prisma) => {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: currentOrderStatus,
          updatedAt: new Date(),
        },
      })

      await prisma.jobAssignment.create({
        data: {
          orderId,
          type: jobType,
          transcriberId: transcriberId,
          inputFile: inputFile,
        },
      })
    })
    logger.info(`FInalize file assigned to ${transcriberId}`)
  } catch (error) {
    logger.error(`failed to create job assignment ${orderId}: ${error}`)
    throw new Error()
  }
}
