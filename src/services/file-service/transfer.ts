import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

async function transferFiles(
  fileIds: string[],
  fromUserId: number,
  toUserId: number
) {
  try {
    const files = await prisma.file.findMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
    })

    if (!files.length) {
      logger.error(`Files not found ${fileIds}`)
      return {
        success: false,
        message: 'Files not found',
      }
    }

    await prisma.file.updateMany({
      where: {
        fileId: {
          in: fileIds,
        },
      },
      data: {
        userId: toUserId,
      },
    })

    logger.info(
      `Successfully transferred files ${fileIds} from ${fromUserId} to ${toUserId}`
    )
    return {
      success: true,
      message: 'Transferred successful',
    }
  } catch (error) {
    logger.error(`Error transferring files`, error)
    return {
      success: false,
      message: 'An error occurred while transferring refund',
    }
  }
}

export default transferFiles
