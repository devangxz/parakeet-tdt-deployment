'use server'

import { getTestTranscriberUserAccount } from './get-test-transcriber-user-account'
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
  orderTs: Date | undefined | null
  passed: boolean | undefined
  score: number | undefined
  completedAt: Date | undefined | null
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
    const testTranscriberUserAccount = await getTestTranscriberUserAccount()

    if (!testTranscriberUserAccount.userId) {
      return {
        success: false,
        error: 'Failed to fetch test files',
      }
    }

    const testFiles = await prisma.file.findMany({
      where: {
        isTestFile: true,
        userId: testTranscriberUserAccount.userId,
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
    const assignedTestFiles = await prisma.testAttempt.findMany({
      where: {
        userId: userId,
        status: 'ACCEPTED',
      },
    })

    const orders = await prisma.order.findMany({
      where: {
        fileId: { in: assignedTestFiles.map((file) => file.fileId) },
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
    const testAttempts = await prisma.testAttempt.findMany({
      where: {
        userId: userId,
        status: {
          in: ['COMPLETED', 'CANCELLED', 'SUBMITTED_FOR_APPROVAL'],
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      include: {
        File: true,
      },
    })

    const formattedFiles = testAttempts.map((testAttempt) => ({
      id: testAttempt.id,
      fileId: testAttempt.fileId,
      filename: testAttempt.File?.filename,
      duration: testAttempt.File?.duration,
      filesize: testAttempt.File?.filesize,
      createdAt: testAttempt.File?.createdAt,
      status: testAttempt.status,
      passed: testAttempt.passed,
      score: testAttempt.score,
      completedAt: testAttempt.completedAt,
      orderTs: testAttempt.completedAt,
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
