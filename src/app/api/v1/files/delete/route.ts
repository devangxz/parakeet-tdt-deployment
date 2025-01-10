import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { deleteFile } from '@/services/file-service/delete-file'

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    const userId = user?.internalTeamUserId || user?.userId

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { fileIds } = await req.json()

    if (!fileIds) {
      return NextResponse.json(
        { message: 'File IDs is required' },
        { status: 400 }
      )
    }

    const fileIdArray = fileIds.split(',').map((id: string) => id.trim())

    if (fileIdArray.length === 0) {
      return NextResponse.json(
        { message: 'No valid file IDs provided' },
        { status: 400 }
      )
    }

    const results = await Promise.allSettled(
      fileIdArray.map((fileId: string) =>
        deleteFile({ userId: userId as number, fileId })
      )
    )

    const failedFiles = results
      .filter((result) => result.status === 'rejected')
      .map((_, index) => fileIdArray[index])

    if (failedFiles.length > 0) {
      logger.warn(`Failed to delete files with IDs: ${failedFiles.join(', ')}`)
    }

    logger.info(`Files deleted successfully: ${fileIdArray.join(', ')}`)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    logger.error(`Failed to delete file: ${error}`)
    return NextResponse.json(
      { message: 'Error deleting file' },
      { status: 500 }
    )
  }
}
