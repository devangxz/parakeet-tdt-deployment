import { InputFileType, OrderStatus, JobType, AssignMode } from '@prisma/client'

import calculateAssignmentAmount from './get-amount'
import { updateOrderAndCreateJobAssignment } from './update-order'
import logger from '@/lib/logger'
import { sendTemplateMail } from '@/lib/ses'

const assignFileToQC = async (
  orderId: number,
  orderStatus: OrderStatus,
  transcriberId: number,
  jobType: JobType,
  inputFile: InputFileType,
  fileId: string,
  assignMode: AssignMode,
  comment?: string,
  isICQC: boolean = false
) => {
  logger.info(
    `--> assignFileToQC ${orderId} ${transcriberId}${isICQC ? ' (IC QC)' : ''}`
  )
  try {
    const assignmentResult = await updateOrderAndCreateJobAssignment(
      orderId,
      orderStatus,
      transcriberId,
      jobType,
      inputFile,
      assignMode,
      comment,
      isICQC
    )

    // If assignment failed (likely due to concurrent assignment), return early
    if (!assignmentResult) {
      logger.info(
        `Assignment failed for ${orderId} - likely already assigned to another transcriber`
      )
      return false
    }

    const { cost, rate } = await calculateAssignmentAmount(
      orderId,
      transcriberId,
      orderStatus
    )

    const templateData = {
      fileId,
      amount: `$${cost} (${rate}/ah)`,
      comment: comment ?? '',
    }

    await sendTemplateMail('QC_ASSIGNMENT', transcriberId, templateData)

    logger.info(`--> assignFileToQC ${orderId} ${transcriberId} completed`)
    return true
  } catch (error) {
    logger.error(`--> assignFileToQC ` + error)
    return false
  }
}

export default assignFileToQC
