"use server"

import { JobStatus, JobType } from "@prisma/client"

import config from '../../../../../config.json'
import { OrderDetails } from "@/components/editor/EditorPage"
import logger from "@/lib/logger"
import prisma from "@/lib/prisma"
import { getAWSSesInstance } from "@/lib/ses"
import { calculateTimerDuration } from "@/utils/editorUtils"

const sendTimeoutMail = async (orderDetails: OrderDetails, userEmailId: string) => {
  try{
    const fileData = await prisma.file.findUnique({
      where: {
        fileId: orderDetails.fileId,
      },
    });

    const jobAssignment = await prisma.jobAssignment.findFirst({
      where: {
        orderId: Number(orderDetails.orderId),
        status: JobStatus.ACCEPTED,
        type: JobType.QC,
      },
    })
    
    if(!fileData){
      logger.error(`File not found for order ${orderDetails.orderId}`)
      return
    }

    if(!jobAssignment){
      logger.error(`Job assignment not found for order ${orderDetails.orderId}`)
      return
    }

    if(jobAssignment.assignMode === 'MANUAL'){
      logger.info(`Job assignment is manual for order ${orderDetails.orderId}`)
      return
    }

    const ses = getAWSSesInstance()
    logger.info(`Sending timeout mail to ${userEmailId} for order ${orderDetails.orderId}`)
    let durationInMs = calculateTimerDuration(fileData.duration)
    if(jobAssignment.extensionRequested){
      durationInMs += fileData.duration * (config.extension_time_multiplier) * 1000
    }
    const response = await ses.sendMail('QC_JOB_TIMEOUT', {
      userEmailId,
    }, {
      filename: orderDetails.filename,
      transcriber_assignment_timeout: (durationInMs / (60 * 60 * 1000)).toFixed(2),
    })

   logger.info(`Timeout Warning mail sent to ${userEmailId} for order ${orderDetails.orderId} ${JSON.stringify(response)}`)
  } catch (error) {
    logger.error(`Error sending timeout mail to ${userEmailId} for order ${orderDetails.orderId}: ${error}`)
  }
}

export { sendTimeoutMail }
