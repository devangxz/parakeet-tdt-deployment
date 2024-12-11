'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function removeSharedFiles(files: string[]) {
  const session = await getServerSession(authOptions)
  const user = session?.user

  if (!user) {
    logger.error('User not authenticated')
    return {
      success: false,
      error: 'User not authenticated',
    }
  }
  try {
    if (!Array.isArray(files) || files.length === 0) {
      return {
        success: false,
        message: 'Invalid or empty files array',
      }
    }

    const deleteResults = await prisma.sharedFile.deleteMany({
      where: {
        fileId: { in: files },
        toUserId: user.userId,
      },
    })

    logger.info(
      `Successfully removed ${deleteResults.count} shared files for ${user.email}`
    )

    return {
      success: true,
      message: 'Successfully removed the files',
      count: deleteResults.count,
    }
  } catch (error) {
    logger.error(`Error removing shared files for ${user.email}: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again later.',
    }
  }
}
