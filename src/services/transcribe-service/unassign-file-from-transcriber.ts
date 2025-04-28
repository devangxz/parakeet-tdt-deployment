import { OrderStatus, JobStatus } from '@prisma/client'

import { updateOrderAndJobAssignment } from './update-order'
import logger from '@/lib/logger'
import { sendTemplateMail } from '@/lib/ses'

const unAssignFileFromTranscriber = async (
  orderId: number,
  assignmentId: number,
  orderStatus: OrderStatus,
  jobStatus: JobStatus,
  transcriberId: number,
  fileId: string,
  type: string,
  comment?: string
) => {
  logger.info(`--> unAssignFileFromTranscriber ${orderId}`)
  try {
    await updateOrderAndJobAssignment(
      orderId,
      assignmentId,
      orderStatus,
      jobStatus
    )

    const templateData = {
      fileId,
      type,
      subject:
        type === 'QC'
          ? 'Scribie.ai Editor File Unassigned'
          : type === 'CF'
          ? 'Scribie.ai Review File Unassigned'
          : 'Scribie.ai Finalizer File Unassigned',
      comment: comment ?? '',
    }

    await sendTemplateMail('UNASSIGN_FILE', transcriberId, templateData)

    logger.info(`--> unAssignFileFromTranscriber ${orderId} ${transcriberId}`)
    return true
  } catch (error) {
    logger.error(`--> unAssignFileFromTranscriber ` + error)
    return false
  }
}

export default unAssignFileFromTranscriber
