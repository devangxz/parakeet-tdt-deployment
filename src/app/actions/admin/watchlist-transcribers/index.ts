'use server'

import { JobStatus, JobType } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export interface WatchlistTranscriber {
  id: number
  firstName: string | null
  lastName: string | null
  email: string
  userId: number
  totalSubmittedHours: number
}

export interface SubmittedFile {
  fileId: string
  duration: number
  completedTime: Date
  orderStatus: string
}

export async function getWatchlistTranscribersAction() {
  try {
    const verifiers = await prisma.verifier.findMany({
      where: {
        watchlist: true,
      },
      include: {
        User: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
      },
    })

    // Process transcribers sequentially to avoid too many connections
    const watchlistTranscribers: WatchlistTranscriber[] = []

    for (const verifier of verifiers) {
      // Get all completed QC jobs for this transcriber
      const completedJobs = await prisma.jobAssignment.findMany({
        where: {
          transcriberId: verifier.userId,
          type: JobType.QC,
          status: JobStatus.COMPLETED,
        },
        include: {
          order: {
            include: {
              File: true,
            },
          },
        },
      })

      // Calculate total hours from the file durations
      const totalSubmittedHours = completedJobs.reduce((total, job) => {
        const durationInSeconds = job.order.File?.duration || 0
        const durationInHours = durationInSeconds / 3600 // Convert seconds to hours
        return total + durationInHours
      }, 0)

      watchlistTranscribers.push({
        id: verifier.id,
        firstName: verifier.User.firstname,
        lastName: verifier.User.lastname,
        email: verifier.User.email,
        userId: verifier.User.id,
        totalSubmittedHours: parseFloat(totalSubmittedHours.toFixed(2)),
      })
    }

    logger.info('Watchlist transcribers fetched successfully')
    return {
      success: true,
      data: watchlistTranscribers,
    }
  } catch (error) {
    logger.error('Error fetching watchlist transcribers', error)
    return {
      success: false,
      message: 'Failed to fetch watchlist transcribers',
    }
  }
}

export async function getTranscriberSubmittedFilesAction(
  transcriberId: number
) {
  try {
    const completedJobs = await prisma.jobAssignment.findMany({
      where: {
        transcriberId,
        type: JobType.QC,
        status: JobStatus.COMPLETED,
      },
      include: {
        order: {
          include: {
            File: true,
          },
        },
      },
      orderBy: {
        completedTs: 'desc',
      },
    })

    const submittedFiles: SubmittedFile[] = completedJobs.map((job) => ({
      fileId: job.order.fileId,
      duration: job.order.File?.duration || 0,
      completedTime: job.completedTs || new Date(),
      orderStatus: job.order.status,
    }))

    logger.info(
      `Submitted files fetched successfully for transcriber ${transcriberId}`
    )
    return {
      success: true,
      data: submittedFiles,
    }
  } catch (error) {
    logger.error(
      `Error fetching submitted files for transcriber ${transcriberId}`,
      error
    )
    return {
      success: false,
      message: 'Failed to fetch submitted files',
    }
  }
}
