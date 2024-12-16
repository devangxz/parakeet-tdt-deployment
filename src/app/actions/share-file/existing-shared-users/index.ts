'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getExistingSharedUsers(fileIds: string[]) {
  try {
    const session = await getServerSession(authOptions)
    const user = session?.user

    if (!fileIds || fileIds.length === 0) {
      return {
        success: false,
        error: 'Missing file IDs',
      }
    }

    const sharedFiles = await prisma.sharedFile.findMany({
      where: {
        fileId: {
          in: Array.from(new Set(fileIds)),
        },
      },
      select: {
        fileId: true,
        permission: true,
        toUser: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
          },
        },
      },
    })

    const result = sharedFiles.map((sf) => ({
      email: sf.toUser.email,
      fullname: `${sf.toUser.firstname || ''} ${
        sf.toUser.lastname || ''
      }`.trim(),
      file_id: sf.fileId,
      to_user_id: sf.toUser.id,
      permission: sf.permission,
    }))

    logger.info(`Sent shared files users for ${user?.email}`)

    return {
      success: true,
      data: result,
    }
  } catch (error) {
    logger.error(`Error sending shared files users: ${error}`)
    return {
      success: false,
      message: 'An error occurred. Please try again later.',
    }
  }
}
