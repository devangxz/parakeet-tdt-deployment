'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function moveFileAction(fileId: string, folderId: number | null) {
    try {

        // Check if the target folder exists and get its parent hierarchy
        const parentFolderName: string[] = []

        const fetchParentFolders = async (currentFolderId: number | null) => {
            if (!currentFolderId) return

            const folder = await prisma.folder.findUnique({
                where: {
                    id: currentFolderId
                },
                select: {
                    id: true,
                    parentId: true,
                    name: true,
                }
            })

            if (folder) {
                parentFolderName.push(folder.name)
                if (folder.parentId) {
                    await fetchParentFolders(folder.parentId)
                }
            }
        }

        await fetchParentFolders(folderId)

        const file = await prisma.file.findUnique({
            where: {
                fileId
            },
            select: {
                filename: true,
            }
        })

        if (!file) {
            return {
                success: false,
                message: 'File not found',
            }
        }

        const fullPath = parentFolderName.reverse().join('/')

        await prisma.file.update({
            where: {
                fileId
            },
            data: {
                parentId: folderId,
                fullPath
            },
        })

        return {
            success: true,
            message: 'File moved successfully',
        }
    } catch (error) {
        logger.error(`Failed to move file`, error)
        return {
            success: false,
            message: 'An error occurred while moving file',
        }
    }
}
