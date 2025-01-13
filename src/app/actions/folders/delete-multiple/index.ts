'use server'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function deleteMultipleFoldersAction(folderIds: number[]) {
    try {
        await prisma.folder.deleteMany({
            where: {
                id: {
                    in: folderIds
                },
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
