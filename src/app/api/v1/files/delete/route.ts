import { NextRequest, NextResponse } from 'next/server'

import logger from '@/lib/logger'
import { authenticateRequest } from '@/services/auth-service/authenticate-api'
import { deleteFile } from '@/services/file-service/delete-file'

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req)
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        { message: 'File ID is required' },
        { status: 400 }
      )
    }

    await deleteFile({ userId: user.userId, fileId })
    logger.info(`File with ID ${fileId} deleted successfully`)

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
