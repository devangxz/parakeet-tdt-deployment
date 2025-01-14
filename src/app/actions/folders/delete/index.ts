'use server'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function deleteFolderAction(folderId: number) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user
        const userId = user?.internalTeamUserId || user?.userId
        const allChildFoldersId: number[] = [folderId]

        const fetchChildFolders = async (folderId: number[]) => {
            for (const folder of folderId) {
                const childFolders = await prisma.folder.findMany({
                    where: {
                        parentId: folder,
                        userId
                    },
                    select: {
                        id: true
                    }
                })
                if (childFolders && childFolders.length > 0) {
                    allChildFoldersId.push(...childFolders.map(folder => folder.id))
                    await fetchChildFolders(childFolders.map(folder => folder.id))
                }
            }

        }
        await fetchChildFolders([folderId])

        // Check if the folder has any children files
        const childrenFiles = await prisma.file.findFirst({
            where: {
                parentId: {
                    in: allChildFoldersId
                },
                userId
            },
            select: {
                id: true
            }
        })

        if (childrenFiles) {
            return {
                success: false,
                message: 'Folder is not empty'
            }
        }

        // Delete the folder and its child folders
        await prisma.folder.deleteMany({
            where: {
                id: {
                    in: allChildFoldersId
                },
                userId
            }
        })

        return {
            success: true,
            message: 'Folder deleted successfully',
        }

    } catch (error) {
        logger.error('Failed to fetch folders:', error)
        return {
            success: false,
            message: 'Internal server error',
        }
    }
}
