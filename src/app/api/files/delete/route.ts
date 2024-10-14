import { NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { deleteFile } from '@/services/file-service/delete-file'

export async function POST(req: Request) {
  let { fileIds } = await req.json()

  if (!Array.isArray(fileIds)) {
    fileIds = [fileIds]
  }
  const userToken = req.headers.get('x-user-token')
  const user = JSON.parse(userToken ?? '{}')
  const userId = user.userId

  try {
    const deletionResults = await Promise.all(
      fileIds.map(async (fileId: string) => {
        await deleteFile({ userId, fileId })
        logger.info(`File with ID ${fileId} deleted successfully`)
        return { fileId, status: 'deleted' }
      })
    )

    const notFoundFiles = deletionResults
      .filter((result) => result.status === 'not found')
      .map((result) => result.fileId)
    if (notFoundFiles.length > 0) {
      return NextResponse.json(
        {
          message: 'Some files not found',
          fileIds: notFoundFiles,
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        message: 'Files deleted successfully',
        fileIds: fileIds,
      },
      { status: 200 }
    )
  } catch (error) {
    logger.error(`Failed to delete files`, error)
    return NextResponse.json(
      { message: 'Failed to delete files' },
      { status: 500 }
    )
  }
}
