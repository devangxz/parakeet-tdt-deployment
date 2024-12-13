'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import { getAllFiles } from '@/services/file-service/get-files'

export async function getAllFilesAction(
  parentId: string | null,
  fileIds: string | null
) {
  const session = await getServerSession(authOptions)
  const user = session?.user
  try {
    const files = await getAllFiles(
      parentId !== 'null' ? Number(parentId) : null,
      fileIds ?? 'null',
      user?.userId as number
    )
    return {
      success: true,
      data: files,
    }
  } catch (error) {
    logger.error('Error fetching all files:', error)
    return {
      success: false,
      message: 'An error occurred. Please try again after some time.',
    }
  }
}
