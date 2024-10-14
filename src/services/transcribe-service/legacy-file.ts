import { JobType, JobStatus } from '@prisma/client'

import prisma from '@/lib/prisma'

const fetchHistoryFiles = async (fileType: JobType, transcriberId: number) => {
  try {
    return await prisma.jobAssignment.findMany({
      where: {
        transcriberId,
        status: JobStatus.COMPLETED,
        type: fileType,
      },
      include: {
        order: {
          include: {
            File: true,
          },
        },
      },
    })
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

export default fetchHistoryFiles
