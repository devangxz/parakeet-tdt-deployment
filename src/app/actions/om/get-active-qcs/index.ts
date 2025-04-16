'use server'

import { Role, Status } from '@prisma/client'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export interface QCReviewer {
  id: number
  email: string
  firstname: string | null
  lastname: string | null
  role: string
}

export async function getActiveQCsAndReviewers(onlyReviewers = false) {
  try {
    const activeUsers = await prisma.user.findMany({
      where: {
        role: {
          in: onlyReviewers ? [Role.REVIEWER] : [Role.QC, Role.REVIEWER],
        },
        status: Status.VERIFIED,
        Verifier: {
          qcDisabled: false,
        },
      },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        role: true,
      },
      orderBy: {
        email: 'asc',
      },
    })

    return {
      success: true,
      data: activeUsers.map((user) => ({
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
      })),
    }
  } catch (error) {
    logger.error('Failed to fetch active QCs and Reviewers', error)
    return {
      success: false,
      message: 'An error occurred while fetching QCs and Reviewers',
      data: [] as QCReviewer[],
    }
  }
}
