'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function CreateOneFolder(folderId: number | null, folderName: string) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user
        const userId = user?.internalTeamUserId || user?.userId

        if (!userId) {
            throw new Error('Unauthorized')
        }

        await prisma.folder.create({
            data: {
                userId: userId,
                name: folderName,
                parentId: folderId,
            },
        })

        return {
            success: true,
            message: 'Folder renamed successfully',
        }

    } catch (error) {
        logger.error('Failed to rename folder:', error)
        return {
            success: false,
            message: 'Internal server error',
        }
    }
}
