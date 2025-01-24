'use server'
import { Folder } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getAllFolderTreeAction() {
    const session = await getServerSession(authOptions)
    const user = session?.user
    const userId = user?.internalTeamUserId || user?.userId

    try {
        const folders = await prisma.folder.findMany({
            where: {
                userId: userId
            }
        })
        interface FileNode {
            name: string
            children: FileNode[]
            parentId?: number | null
            id: number
        }

        const buildFolderTree = (folders: Folder[]): FileNode[] => {
            const folderMap = new Map<number, FileNode>()
            const rootFolders: FileNode[] = []

            // Create map of all folders
            folders.forEach(folder => {
                folderMap.set(folder.id, {
                    name: folder.name,
                    parentId: folder.parentId,
                    id: folder.id,
                    children: []
                })
            })

            // Build tree structure 
            folders.forEach(folder => {
                const folderWithChildren = folderMap.get(folder.id)
                if (folderWithChildren) {
                    if (folder.parentId === null) {
                        rootFolders.push(folderWithChildren)
                    } else {
                        const parentFolder = folderMap.get(folder.parentId)
                        if (parentFolder) {
                            parentFolder.children.push(folderWithChildren)
                        }
                    }
                }
            })

            return rootFolders
        }

        const folderTree = buildFolderTree(folders)

        return {
            success: true,
            data: folderTree,
            message: 'Folder tree fetched successfully'
        }

    } catch (error) {
        logger.error('Failed to fetch folder tree:', error)
        return {
            success: false,
            message: 'Internal server error',
        }
    }
}
