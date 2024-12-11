import { OrderStatus, JobStatus } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface RenameFileParams {
  fileId: string
  newName: string
}

interface ArchiveFileParams {
  fileId: string
  archive: boolean
}

export async function renameFile({ fileId, newName }: RenameFileParams) {
  try {
    await prisma.file.update({
      where: { fileId },
      data: { filename: newName },
    })

    logger.info(`Successfully renamed file ${fileId} to ${newName}`)
    return { success: true, s: 'File renamed successfully' }
  } catch (error) {
    logger.error('Error renaming file:', error)
    return { success: false, s: 'Failed to rename file' }
  }
}

export async function cancelOrder(fileId: string) {
  try {
    const order = await prisma.order.findFirst({
      where: {
        fileId: fileId,
      },
    })

    if (!order) {
      logger.error(`Order not found for file ${fileId}`)
      return { success: false, s: 'Order not found' }
    }

    if (order.status === OrderStatus.DELIVERED) {
      logger.error(`File is already delivered ${fileId}`)
      return { success: false, s: 'File is already delivered' }
    }

    await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      },
    })

    await prisma.jobAssignment.updateMany({
      where: {
        orderId: order.id,
      },
      data: {
        status: JobStatus.CANCELLED,
        cancelledTs: new Date(),
      },
    })

    logger.info(`Successfully cancelled order for file ${fileId}`)
    return { success: true, s: 'Order cancelled successfully' }
  } catch (error) {
    logger.error('Error cancelling order:', error)
    return { success: false, s: 'Failed to cancel order' }
  }
}

export async function toggleArchive({ fileId, archive }: ArchiveFileParams) {
  try {
    await prisma.file.updateMany({
      where: {
        fileId: {
          in: fileId.split(','),
        },
      },
      data: { archived: archive },
    })

    logger.info(
      `Successfully ${archive ? 'archived' : 'unarchived'} file ${fileId}`
    )
    return {
      success: true,
      s: `File ${archive ? 'archived' : 'unarchived'} successfully`,
    }
  } catch (error) {
    logger.error('Error updating archive status:', error)
    return { success: false, s: 'Failed to update archive status' }
  }
}
