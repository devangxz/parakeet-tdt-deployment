import { OrderStatus, JobType, InputFileType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import { sendTemplateMail } from '@/lib/ses'

const assignFileToReviewer = async (
  orderId: number,
  fileId: string,
  transcriberId: number,
  inputFile: InputFileType,
  changeOrderStatus: boolean = true
) => {
  logger.info(`--> assignFileToReviewer ${orderId} ${transcriberId}`)
  try {
    await prisma.$transaction(async (prisma) => {
      if (changeOrderStatus) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.REVIEWER_ASSIGNED,
            updatedAt: new Date(),
          },
        })
      }

      await prisma.jobAssignment.create({
        data: {
          orderId,
          type: JobType.REVIEW,
          transcriberId: transcriberId,
          inputFile: inputFile,
        },
      })
    })

    const templateData = {
      fileId,
    }

    await sendTemplateMail('REVIEWER_ASSIGNMENT', transcriberId, templateData)

    logger.info(`--> assignFileToReviewer ${orderId} ${transcriberId}`)
    return true
  } catch (error) {
    logger.error(`--> assignFileToReviewer ` + error)
    return false
  }
}

export default assignFileToReviewer
