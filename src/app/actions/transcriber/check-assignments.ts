'use server'

import { JobStatus, JobType } from '@prisma/client'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'
import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

interface AssignmentResult {
  hasAssignedFiles: boolean
  hasQCFiles: boolean
  hasReviewFiles: boolean
  redirectUrl: string | null
}

export async function checkTranscriberAssignments(): Promise<AssignmentResult> {
  const session = await getServerSession(authOptions)
  const user = session?.user
  const transcriberId = user?.userId as number

  if (!transcriberId) {
    logger.info('No user found in session')
    return {
      hasAssignedFiles: false,
      hasQCFiles: false,
      hasReviewFiles: false,
      redirectUrl: null,
    }
  }

  try {
    const qcAssignments = await prisma.jobAssignment.count({
      where: {
        transcriberId,
        status: JobStatus.ACCEPTED,
        type: {
          in: [JobType.QC, JobType.REVIEW],
        },
      },
    })

    const finalizeAssignments = await prisma.jobAssignment.count({
      where: {
        transcriberId,
        status: JobStatus.ACCEPTED,
        type: JobType.FINALIZE,
      },
    })

    const hasQCFiles = qcAssignments > 0
    const hasReviewFiles = finalizeAssignments > 0
    const hasAssignedFiles = hasQCFiles || hasReviewFiles

    let redirectUrl = null

    if (hasQCFiles) {
      if (user?.legalEnabled) {
        redirectUrl = '/transcribe/legal-qc?tab=assigned'
      } else {
        redirectUrl = '/transcribe/qc?tab=assigned'
      }
    } else if (hasReviewFiles) {
      if (user?.legalEnabled) {
        redirectUrl = '/transcribe/legal-cf-reviewer?tab=assigned'
      } else {
        redirectUrl = '/transcribe/general-cf-reviewer?tab=assigned'
      }
    }

    logger.info(
      `Checked assignments for user ${transcriberId}: QC=${qcAssignments}, Finalize=${finalizeAssignments}`
    )

    return {
      hasAssignedFiles,
      hasQCFiles,
      hasReviewFiles,
      redirectUrl,
    }
  } catch (error) {
    logger.error('Error checking for assigned files:', error)
    return {
      hasAssignedFiles: false,
      hasQCFiles: false,
      hasReviewFiles: false,
      redirectUrl: null,
    }
  }
}
