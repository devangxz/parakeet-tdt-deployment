import { InputFileType, OrderStatus, JobType, AssignMode } from '@prisma/client'

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
  assignMode: AssignMode
) => {
  logger.info(`--> assignFileToQC ${orderId} ${transcriberId}`)
  try {
    await updateOrderAndCreateJobAssignment(
      orderId,
      orderStatus,
      transcriberId,
      jobType,
      inputFile,
      assignMode
    )

    const templateData = {
      fileId,
    }

    await sendTemplateMail('QC_ASSIGNMENT', transcriberId, templateData)

    logger.info(`--> assignFileToQC ${orderId} ${transcriberId}`)
    return true
  } catch (error) {
    logger.error(`--> assignFileToQC ` + error)
    return false
  }
}

export default assignFileToQC
