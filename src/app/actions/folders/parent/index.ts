'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getFolderHierarchy(folderId: string) {
  try {
    if (!folderId) {
      return {
        success: false,
        message: 'Folder ID is required',
      }
    }

    const folderHierarchy = []
    let currentFolderId = Number(folderId)

    while (currentFolderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: Number(currentFolderId) },
      })

      if (!folder) {
        break
      }

      folderHierarchy.unshift(folder)
      currentFolderId = folder.parentId as number
    }

    return {
      success: true,
      folderHierarchy,
    }
  } catch (error) {
    logger.error('Failed to fetch parent folders:', error)
    return {
      success: false,
      message: 'Internal server error',
    }
  }
}
