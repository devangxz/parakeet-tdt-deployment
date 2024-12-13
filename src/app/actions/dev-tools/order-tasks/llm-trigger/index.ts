'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'
import {
  WORKER_QUEUE_NAMES,
  workerQueueService,
} from '@/services/worker-service'

export async function triggerLLMMarking(fileId: string) {
  try {
    if (!fileId) {
      return {
        success: false,
        message: 'File ID is required',
      }
    }

    const order = await prisma.order.findUnique({
      where: { fileId },
    })

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      }
    }

    await workerQueueService.createJob(WORKER_QUEUE_NAMES.LLM_MARKING, {
      orderId: order.id,
      fileId: order.fileId,
    })

    logger.info(`LLM marking job created for file ${fileId}`)

    return {
      success: true,
      message: 'LLM marking triggered successfully',
    }
  } catch (error) {
    logger.error('Error triggering LLM marking:', error)
    return {
      success: false,
      message: 'Failed to trigger LLM marking',
    }
  }
}
