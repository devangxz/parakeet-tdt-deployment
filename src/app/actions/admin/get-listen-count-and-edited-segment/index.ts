'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getListenCountAndEditedSegmentAction(fileId: string) {
    try {
        const playerStats = await prisma.playStats.findFirst({
            where: {
                fileId
            }
        })
        return {
            success: true,
            listenCount: playerStats?.listenCount,
            editedSegments: playerStats?.editedSegments
        }
    } catch (error) {
        logger.error(`Error while fetching listen count and edited segments`, error)
        return {
            success: false,
            s: 'An error occurred. Please try again after some time.',
        }
    }
}
