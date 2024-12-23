'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface FileUpdateInfo {
  fileId: string
  risData: string
  instructions: string
  dueDate: string
  templateId: string
}

export async function updateFilesInfo(files: FileUpdateInfo[]) {
  try {
    for (const file of files) {
      await prisma.file.update({
        where: { fileId: file.fileId },
        data: {
          customFormattingDetails: JSON.parse(file.risData),
          customInstructions: JSON.stringify({
            instructions: file.instructions,
            dueDate: file.dueDate,
            templateId: file.templateId,
          }),
        },
      })
    }
    logger.info('Updated files info')
    return {
      success: true,
      message: 'Files updated successfully.',
    }
  } catch (error) {
    logger.error('Failed to update files info', error)
    return {
      success: false,
      message: 'Failed to update file info.',
    }
  }
}
