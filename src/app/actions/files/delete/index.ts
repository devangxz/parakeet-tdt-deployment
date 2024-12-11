'use server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { deleteFile } from '@/services/file-service/delete-file'

export async function deleteFilesAction(fileIds: string | string[]) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const userId = user?.internalTeamUserId || user?.userId
  if (!Array.isArray(fileIds)) {
    fileIds = [fileIds]
  }

  try {
    const deletionResults = await Promise.all(
      fileIds.map(async (fileId: string) => {
        await deleteFile({ userId: userId!, fileId })
        logger.info(`File with ID ${fileId} deleted successfully`)
        return { fileId, status: 'deleted' }
      })
    )

    const notFoundFiles = deletionResults
      .filter((result) => result.status === 'not found')
      .map((result) => result.fileId)

    if (notFoundFiles.length > 0) {
      return {
        success: false,
        s: 'Some files not found',
        fileIds: notFoundFiles,
      }
    }

    return {
      success: true,
      s: 'Files deleted successfully',
      fileIds: fileIds,
    }
  } catch (error) {
    logger.error(`Failed to delete files`, error)
    return {
      success: false,
      s: 'An error occurred while deleting files',
    }
  }
}
