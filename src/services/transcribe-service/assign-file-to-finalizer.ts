import { InputFileType, OrderStatus, JobType, AssignMode } from '@prisma/client'

import { updateOrderAndCreateJobAssignment } from './update-order'
import logger from '@/lib/logger'
import { sendTemplateMail } from '@/lib/ses'

const assignFileToFinalizer = async (
  orderId: number,
  fileId: string,
  transcriberId: number,
  inputFile: InputFileType,
  assignMode: AssignMode
) => {
  logger.info(`--> assignFileToFinalizer ${orderId} ${transcriberId}`)
  try {
    await updateOrderAndCreateJobAssignment(
      orderId,
      OrderStatus.FINALIZER_ASSIGNED,
      transcriberId,
      JobType.FINALIZE,
      inputFile,
      assignMode
    )

    const templateData = {
      fileId,
    }

    await sendTemplateMail('REVIEWER_ASSIGNMENT', transcriberId, templateData)

    logger.info(`--> assignFileToFinalizer ${orderId} ${transcriberId}`)
    return true
  } catch (error) {
    logger.error(`--> assignFileToFinalizer ` + error)
    return false
  }
}

export default assignFileToFinalizer
