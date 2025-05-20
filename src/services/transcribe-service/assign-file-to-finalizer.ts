import { InputFileType, OrderStatus, JobType, AssignMode } from '@prisma/client'

import calculateAssignmentAmount from './get-amount'
import { updateOrderAndCreateJobAssignment } from './update-order'
import logger from '@/lib/logger'
import { sendTemplateMail } from '@/lib/ses'

const assignFileToFinalizer = async (
  orderId: number,
  fileId: string,
  transcriberId: number,
  inputFile: InputFileType,
  assignMode: AssignMode,
  comment?: string
) => {
  logger.info(`--> assignFileToFinalizer ${orderId} ${transcriberId}`)
  try {
    const assignmentResult = await updateOrderAndCreateJobAssignment(
      orderId,
      OrderStatus.FINALIZER_ASSIGNED,
      transcriberId,
      JobType.FINALIZE,
      inputFile,
      assignMode,
      comment
    )

    if (!assignmentResult) {
      logger.info(
        `Assignment failed for ${orderId} - likely already assigned to another transcriber`
      )
      return false
    }

    const { cost, rate } = await calculateAssignmentAmount(
      orderId,
      transcriberId,
      OrderStatus.FINALIZER_ASSIGNED
    )

    const templateData = {
      fileId,
      amount: `$${cost} (${rate}/ah)`,
      comment: comment ?? '',
    }

    await sendTemplateMail('FINALIZER_ASSIGNMENT', transcriberId, templateData)

    logger.info(`--> assignFileToFinalizer ${orderId} ${transcriberId}`)
    return true
  } catch (error) {
    logger.error(`--> assignFileToFinalizer ` + error)
    return false
  }
}

export default assignFileToFinalizer
