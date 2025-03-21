'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export async function getListenCountAndEditedSegmentAction(fileId: string) {
    try {
        const jobAssignment = await prisma.jobAssignment.findFirst({
          where: {
              status: 'SUBMITTED_FOR_APPROVAL',
              order: {
                  fileId
              }
          },
          select: {
              transcriberId: true
          }
        })

        if(!jobAssignment) {
          logger.error(`No transcriberId with SUBMITTED_FOR_APPROVAL status found for fileId ${fileId}`)
          return {
            success: false,
            message: 'No transcriberId with SUBMITTED_FOR_APPROVAL status found'
          }
        }

        const playerStats = await prisma.playStats.findFirst({
          where: {
            fileId,
            userId: jobAssignment.transcriberId
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
