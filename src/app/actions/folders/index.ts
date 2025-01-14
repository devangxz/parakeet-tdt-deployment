'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getFolders(parentId: string, allFolders = false) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user
    let folders
    if (parentId || parentId === 'null') {

      if (allFolders) {
        folders = await prisma.folder.findMany({
          where: {
            userId: Number(user?.userId),
          },
        })
      } else {
        folders = await prisma.folder.findMany({
          where: {
            userId: Number(user?.userId),
            parentId: parentId !== 'null' ? Number(parentId) : null,
          },
        })
      }

      return {
        success: true,
        folders,
      }
    }
    return {
      success: true,
      folders: [],
    }
  } catch (error) {
    logger.error('Failed to fetch folders:', error)
    return {
      success: false,
      message: 'Internal server error',
    }
  }
}
