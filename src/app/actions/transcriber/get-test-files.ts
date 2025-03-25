'use server'

import logger from '@/lib/logger'
import prisma from '@/lib/prisma'

export interface TestFile {
  id: number
  fileId: string
  filename: string | undefined
  duration: number | undefined
  filesize: string | undefined
  createdAt: Date | undefined
}

export interface TestAttempt {
  id: number
  fileId: string
  filename: string | undefined
  duration: number | undefined
  filesize: string | undefined
  createdAt: Date | undefined
  status: string
  orderTs: Date | undefined
  passed: boolean | undefined
  score: number | undefined
  completedAt: Date | undefined
}

interface TestFilesResponse {
  success: boolean
  data?: TestFile[]
  error?: string
}

interface TestHistoryResponse {
  success: boolean
  data?: TestAttempt[]
  error?: string
}

export async function getTestFiles(): Promise<TestFilesResponse> {
  try {
    const testFiles = await prisma.file.findMany({
      where: {
        isTestFile: true,
        Orders: {
          none: {},
        },
      },
      select: {
        id: true,
        fileId: true,
        filename: true,
        duration: true,
        filesize: true,
        createdAt: true,
      },
    })

    return {
      success: true,
      data: testFiles,
    }
  } catch (error) {
    logger.error(`Error fetching test files: ${error}`)
    return {
      success: false,
      error: 'Failed to fetch test files',
    }
  }
}

export async function getAssignedTestFiles(
  userId: number
): Promise<TestFilesResponse> {
  try {
    const assignedTestFiles = await prisma.jobAssignment.findMany({
      where: {
        transcriberId: userId,
        type: 'TEST',
        status: 'ACCEPTED',
      },
    })

    const orders = await prisma.order.findMany({
      where: {
        id: { in: assignedTestFiles.map((file) => file.orderId) },
      },
      select: {
        id: true,
        fileId: true,
        status: true,
        orderTs: true,
        File: {
          select: {
            filename: true,
            duration: true,
            filesize: true,
            createdAt: true,
          },
        },
      },
    })

    const formattedFiles = orders.map((file) => ({
      id: file.id,
      fileId: file.fileId,
      filename: file.File?.filename,
      duration: file.File?.duration,
      filesize: file.File?.filesize,
      createdAt: file.File?.createdAt,
      status: file.status,
      orderTs: file.orderTs,
    }))

    return {
      success: true,
      data: formattedFiles,
    }
  } catch (error) {
    logger.error(`Error fetching assigned test files: ${error}`)
    return {
      success: false,
      error: 'Failed to fetch assigned test files',
    }
  }
}

export async function getTestHistory(
  userId: number
): Promise<TestHistoryResponse> {
  try {
    const testAssignments = await prisma.jobAssignment.findMany({
      where: {
        transcriberId: userId,
        type: 'TEST',
        status: {
          in: ['COMPLETED', 'CANCELLED'],
        },
      },
    })

    const testFiles = await prisma.order.findMany({
      where: {
        id: { in: testAssignments.map((assignment) => assignment.orderId) },
      },
      select: {
        id: true,
        fileId: true,
        status: true,
        orderTs: true,
        File: {
          select: {
            filename: true,
            duration: true,
            filesize: true,
            createdAt: true,
            TestAttempt: {
              select: {
                passed: true,
                score: true,
                completedAt: true,
              },
            },
          },
        },
      },
    })

    const formattedFiles = testFiles.map((file) => ({
      id: file.id,
      fileId: file.fileId,
      filename: file.File?.filename,
      duration: file.File?.duration,
      filesize: file.File?.filesize,
      createdAt: file.File?.createdAt,
      status: file.status,
      passed: file.File?.TestAttempt[0]?.passed,
      score: file.File?.TestAttempt[0]?.score,
      completedAt: file.File?.TestAttempt[0]?.completedAt,
      orderTs: file.orderTs,
    }))

    return {
      success: true,
      data: formattedFiles,
    }
  } catch (error) {
    logger.error(`Error fetching test history: ${error}`)
    return {
      success: false,
      error: 'Failed to fetch test history',
    }
  }
}
